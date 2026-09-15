# Fundación: Rubro + Sistema de Tiers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la fundación de datos y lógica (clasificación de negocio, tiers con feature-gating híbrido, facturación, memoria cross-conversación del cliente) que van a necesitar los sub-proyectos C (CRM Turnos), B (CRM Ventas) y D (Panel Admin).

**Architecture:** Migraciones SQL aplicadas vía Supabase MCP (mismo patrón que Fases 1-3), una función pura `hasFeature()` testeada que centraliza toda decisión de gating, y una extensión del webhook existente para que la carga de historial sea cross-conversación en vez de por-conversación.

**Tech Stack:** Next.js 16, TypeScript, Supabase (Postgres + RLS), Vitest.

## Global Constraints

- Todas las tablas nuevas llevan `tenant_id UUID NOT NULL` + policy RLS `tenant_id = (select auth.uid())`, igual que las 5 tablas existentes
- Cero valores hardcodeados de tier en componentes — todo pasa por `hasFeature()`
- Cada migración se aplica vía Supabase MCP (`apply_migration`) contra el proyecto real `afleydeeytyfgpytlimm` y se versiona en `supabase/migrations/`
- Después de aplicar migraciones nuevas, correr `get_advisors` (security + performance) y resolver cualquier warning antes de dar la task por terminada — mismo estándar que Fases 1-3
- TDD: test primero (debe fallar), implementación, test pasa, commit

---

## File Structure

```
supabase/migrations/
  0006_negocio_tipo_crm_rubro.sql
  0007_negocio_tier_premium.sql
  0008_negocio_feature_overrides.sql
  0009_negocio_facturacion.sql
  0010_clientes.sql

apps/web/lib/plans/
  features.ts              # TIER_FEATURES + hasFeature()
  features.test.ts

apps/web/lib/agent/
  handle-incoming-message.ts   # modificar: loadRecentMessages ahora cross-conversación
  handle-incoming-message.test.ts  # agregar casos

apps/web/app/signup/
  page.tsx                 # modificar: agregar selects de tipo_crm y rubro

apps/web/lib/supabase/
  types_db.ts               # regenerar desde el schema actualizado
```

---

## Task 1: Migración — tipo_crm y rubro en negocio

**Files:**
- Create: `supabase/migrations/0006_negocio_tipo_crm_rubro.sql`

**Interfaces:**
- Produces: columnas `negocio.tipo_crm` y `negocio.rubro`, consumidas por el signup (Task 6) y por las páginas de C/B más adelante.

- [ ] **Step 1: Aplicar la migración vía Supabase MCP**

```sql
alter table negocio add column tipo_crm text not null default 'turnos'
  check (tipo_crm in ('ventas', 'turnos'));
alter table negocio add column rubro text;
```

Usar `mcp__Supabase__apply_migration` con `name: "negocio_tipo_crm_rubro"`, `project_id: "afleydeeytyfgpytlimm"`.

- [ ] **Step 2: Verificar con una query de sistema**

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'negocio' and column_name in ('tipo_crm', 'rubro');
```

Expected: 2 filas, `tipo_crm` con default `'turnos'`.

- [ ] **Step 3: Correr `get_advisors` (security) y confirmar 0 warnings nuevos**

- [ ] **Step 4: Guardar el SQL aplicado en el archivo de migración local y commit**

```bash
git add supabase/migrations/0006_negocio_tipo_crm_rubro.sql
git commit -m "feat(db): agregar tipo_crm y rubro a negocio"
```

---

## Task 2: Migración — extender tier a premium

**Files:**
- Create: `supabase/migrations/0007_negocio_tier_premium.sql`

**Interfaces:**
- Consumes: constraint existente `negocio_tier_check` (creada en Fase 1, Task 5)
- Produces: `negocio.tier` acepta `'premium'`, consumido por `hasFeature()` (Task 4)

- [ ] **Step 1: Aplicar la migración**

```sql
alter table negocio drop constraint negocio_tier_check;
alter table negocio add constraint negocio_tier_check
  check (tier in ('base', 'pro', 'premium'));
```

- [ ] **Step 2: Verificar que un update a 'premium' funciona y uno a un valor inválido falla**

```sql
-- debe funcionar (probar y revertir):
update negocio set tier = 'premium' where false; -- no afecta filas, solo valida sintaxis del check
-- confirmar el constraint activo:
select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'negocio_tier_check';
```

Expected: la definición incluye `'premium'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0007_negocio_tier_premium.sql
git commit -m "feat(db): extender negocio.tier para aceptar premium"
```

---

## Task 3: Migración — negocio_feature_overrides

**Files:**
- Create: `supabase/migrations/0008_negocio_feature_overrides.sql`

**Interfaces:**
- Consumes: `negocio.tenant_id`
- Produces: tabla consumida por `hasFeature()` (Task 4)

- [ ] **Step 1: Aplicar la migración**

```sql
create table negocio_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  feature_key text not null,
  habilitado boolean not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, feature_key)
);

alter table negocio_feature_overrides enable row level security;
create policy tenant_isolation_negocio_feature_overrides on negocio_feature_overrides
  using (tenant_id = (select auth.uid()));
```

- [ ] **Step 2: Correr `get_advisors` (security + performance) — confirmar 0 warnings**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0008_negocio_feature_overrides.sql
git commit -m "feat(db): tabla negocio_feature_overrides con RLS"
```

---

## Task 4: hasFeature() — función pura de feature-gating

**Files:**
- Create: `apps/web/lib/plans/features.ts`
- Test: `apps/web/lib/plans/features.test.ts`

**Interfaces:**
- Consumes: `Tier` ('base'|'pro'|'premium'), lista de overrides `{feature_key, habilitado}[]`
- Produces: `hasFeature(tier, overrides, featureKey): boolean` — va a ser usada por TODA la UI de C, B y D para mostrar/ocultar funcionalidad. También exporta `TIER_FEATURES` y el tipo `FeatureKey`.

- [ ] **Step 1: Escribir los tests**

```ts
// apps/web/lib/plans/features.test.ts
import { describe, it, expect } from 'vitest';
import { hasFeature } from './features';

describe('hasFeature', () => {
  it('tier base tiene agente_responde', () => {
    expect(hasFeature('base', [], 'agente_responde')).toBe(true);
  });

  it('tier base NO tiene combos_promociones (feature de pro)', () => {
    expect(hasFeature('base', [], 'combos_promociones')).toBe(false);
  });

  it('tier pro tiene combos_promociones pero no cobro_mercadopago', () => {
    expect(hasFeature('pro', [], 'combos_promociones')).toBe(true);
    expect(hasFeature('pro', [], 'cobro_mercadopago')).toBe(false);
  });

  it('tier premium tiene todo: base + pro + cobro_mercadopago', () => {
    expect(hasFeature('premium', [], 'agente_responde')).toBe(true);
    expect(hasFeature('premium', [], 'combos_promociones')).toBe(true);
    expect(hasFeature('premium', [], 'cobro_mercadopago')).toBe(true);
  });

  it('un override habilitado=true desbloquea una feature fuera del tier', () => {
    const overrides = [{ feature_key: 'cobro_mercadopago', habilitado: true }];
    expect(hasFeature('base', overrides, 'cobro_mercadopago')).toBe(true);
  });

  it('un override habilitado=false bloquea una feature que el tier sí incluiría', () => {
    const overrides = [{ feature_key: 'agente_responde', habilitado: false }];
    expect(hasFeature('premium', overrides, 'agente_responde')).toBe(false);
  });

  it('un override de una feature distinta no afecta el resultado', () => {
    const overrides = [{ feature_key: 'otra_feature', habilitado: true }];
    expect(hasFeature('base', overrides, 'combos_promociones')).toBe(false);
  });
});
```

- [ ] **Step 2: Correr, debe fallar**

Run: `cd apps/web && npx vitest run lib/plans/features.test.ts`
Expected: FAIL — módulo no existe

- [ ] **Step 3: Implementar**

```ts
// apps/web/lib/plans/features.ts
export type Tier = 'base' | 'pro' | 'premium';

export type FeatureKey =
  | 'agente_responde'
  | 'agendar_citas'
  | 'notificaciones'
  | 'derivar_vendedor'
  | 'memoria_conversacional'
  | 'combos_promociones'
  | 'descuentos_configurables'
  | 'saludo_cumpleanos'
  | 'turnos_fijos_mensualizados'
  | 'cuenta_corriente'
  | 'cobro_mercadopago'
  | 'transferencias'
  | 'comprobantes'
  | 'billeteras_virtuales';

const BASE_FEATURES: FeatureKey[] = [
  'agente_responde',
  'agendar_citas',
  'notificaciones',
  'derivar_vendedor',
  'memoria_conversacional',
];

const PRO_FEATURES: FeatureKey[] = [
  ...BASE_FEATURES,
  'combos_promociones',
  'descuentos_configurables',
  'saludo_cumpleanos',
  'turnos_fijos_mensualizados',
  'cuenta_corriente',
];

const PREMIUM_FEATURES: FeatureKey[] = [
  ...PRO_FEATURES,
  'cobro_mercadopago',
  'transferencias',
  'comprobantes',
  'billeteras_virtuales',
];

export const TIER_FEATURES: Record<Tier, FeatureKey[]> = {
  base: BASE_FEATURES,
  pro: PRO_FEATURES,
  premium: PREMIUM_FEATURES,
};

interface FeatureOverride {
  feature_key: string;
  habilitado: boolean;
}

export function hasFeature(
  tier: Tier,
  overrides: FeatureOverride[],
  featureKey: FeatureKey
): boolean {
  const override = overrides.find((o) => o.feature_key === featureKey);
  if (override) return override.habilitado;

  return TIER_FEATURES[tier].includes(featureKey);
}
```

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run lib/plans/features.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/plans
git commit -m "feat(plans): hasFeature() con feature-gating híbrido (tier + overrides)"
```

---

## Task 5: Migración — facturación del plan

**Files:**
- Create: `supabase/migrations/0009_negocio_facturacion.sql`

**Interfaces:**
- Produces: columnas consumidas por el panel admin (sub-proyecto D, fuera de este plan)

- [ ] **Step 1: Aplicar la migración**

```sql
alter table negocio add column plan_ciclo_facturacion text not null default 'mensual'
  check (plan_ciclo_facturacion in ('mensual', 'anual'));
alter table negocio add column plan_fecha_alta date;
alter table negocio add column plan_fecha_vencimiento date;
alter table negocio add column plan_estado_pago text not null default 'al_dia'
  check (plan_estado_pago in ('al_dia', 'vencido', 'pendiente'));
```

- [ ] **Step 2: Verificar columnas**

```sql
select column_name, column_default from information_schema.columns
where table_name = 'negocio' and column_name like 'plan_%';
```

Expected: 4 filas.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0009_negocio_facturacion.sql
git commit -m "feat(db): columnas de facturación del plan en negocio"
```

---

## Task 6: Migración — tabla clientes (memoria cross-conversación)

**Files:**
- Create: `supabase/migrations/0010_clientes.sql`

**Interfaces:**
- Consumes: `negocio.tenant_id`
- Produces: tabla `clientes`, consumida por Task 7 (loadRecentMessages cross-conversación) y más adelante por C (saludo de cumpleaños, notas del vendedor)

- [ ] **Step 1: Aplicar la migración**

```sql
create table clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  phone text not null,
  nombre text,
  fecha_nacimiento date,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, phone)
);

create index idx_clientes_tenant_phone on clientes(tenant_id, phone);

alter table clientes enable row level security;
create policy tenant_isolation_clientes on clientes
  using (tenant_id = (select auth.uid()));
```

- [ ] **Step 2: Correr `get_advisors` (security + performance) — confirmar 0 warnings**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0010_clientes.sql
git commit -m "feat(db): tabla clientes para memoria cross-conversación"
```

---

## Task 7: Memoria cross-conversación en el webhook

**Files:**
- Modify: `apps/web/lib/agent/handle-incoming-message.test.ts`
- Modify: `apps/web/lib/agent/handle-incoming-message.ts`
- Modify: `apps/web/app/api/webhooks/whatsapp/route.ts`

**Interfaces:**
- Consumes: tabla `clientes` (Task 6)
- Produces: `loadRecentMessages` deja de recibir solo `conversationId` — ahora recibe `(tenantId, phoneFrom)` y busca cross-conversación. Esto es un cambio de firma que rompe el mock existente en el test — hay que actualizarlo.

- [ ] **Step 1: Actualizar el test para reflejar la nueva firma (debe fallar)**

```ts
// En handle-incoming-message.test.ts, actualizar makeDeps():
loadRecentMessages: vi.fn().mockResolvedValue([]),
// ...
// Y agregar un test nuevo:
it('carga el historial por tenantId + phoneFrom, no solo por conversationId (memoria cross-conversación)', async () => {
  const deps = makeDeps();
  await handleIncomingMessage(
    { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola de nuevo' },
    deps
  );
  expect(deps.loadRecentMessages).toHaveBeenCalledWith('tenant-a', '5491100000000');
});
```

- [ ] **Step 2: Correr, debe fallar** (la llamada actual pasa `conversation.id`, no `tenantId + phoneFrom`)

Run: `npx vitest run lib/agent/handle-incoming-message.test.ts`
Expected: FAIL en el nuevo test

- [ ] **Step 3: Actualizar la interfaz `Deps` y la llamada en `handle-incoming-message.ts`**

```ts
// cambiar la firma en la interfaz Deps:
loadRecentMessages: (
  tenantId: string,
  phoneFrom: string
) => Promise<Array<{ role: 'user' | 'assistant'; content: string }>>;

// y la línea que la llama:
const history = await deps.loadRecentMessages(negocio.tenant_id, incoming.from);
```

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run lib/agent/handle-incoming-message.test.ts`
Expected: PASS (6 tests — los 5 anteriores + el nuevo)

- [ ] **Step 5: Actualizar el route handler real para implementar la query cross-conversación**

```ts
// en app/api/webhooks/whatsapp/route.ts, reemplazar loadRecentMessages:
loadRecentMessages: async (tenantId, phoneFrom) => {
  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('phone_from', phoneFrom);

  const conversationIds = (convs ?? []).map((c) => c.id);
  if (conversationIds.length === 0) return [];

  const { data } = await supabase
    .from('messages')
    .select('role, content')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })
    .limit(10);

  return ((data ?? []) as Array<{ role: string; content: string }>)
    .reverse()
    .filter((m) => m.role === 'user' || m.role === 'assistant') as never;
},
```

- [ ] **Step 6: `tsc --noEmit` limpio y suite completa pasando**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errores de tipos, todos los tests en verde

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/agent apps/web/app/api/webhooks
git commit -m "feat(agent): memoria cross-conversación (historial por tenant+phone, no por conversación)"
```

---

## Task 8: Signup con tipo_crm y rubro

**Files:**
- Modify: `apps/web/app/signup/page.tsx`
- Modify: trigger `handle_new_user()` en Supabase (migración nueva)

**Interfaces:**
- Consumes: `negocio.tipo_crm`, `negocio.rubro` (Task 1)
- Produces: negocio creado con clasificación completa desde el signup

- [ ] **Step 1: Migración — actualizar el trigger para leer tipo_crm y rubro**

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.negocio (tenant_id, nombre, phone_number_id, meta_connection_status, tipo_crm, rubro)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre_negocio', split_part(new.email, '@', 1)),
    'pending_' || new.id::text,
    'disconnected',
    coalesce(new.raw_user_meta_data->>'tipo_crm', 'turnos'),
    new.raw_user_meta_data->>'rubro'
  );
  return new;
end;
$$;
```

Aplicar vía `apply_migration`, `name: "trigger_tipo_crm_rubro"`.

- [ ] **Step 2: Probar el trigger actualizado con un usuario de test (igual que en Fase 2)**

```sql
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated', 'test-rubro@example.com',
  crypt('Password123!', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  '{"nombre_negocio":"Cancha Test","tipo_crm":"turnos","rubro":"cancha_padel"}',
  now(), now(), '', ''
);

select n.tipo_crm, n.rubro from negocio n
join auth.users u on u.id = n.tenant_id
where u.email = 'test-rubro@example.com';
```

Expected: `tipo_crm = 'turnos'`, `rubro = 'cancha_padel'`. Después limpiar el usuario de test (igual que en Fase 2, Task de auth).

- [ ] **Step 3: Agregar los selects al formulario de signup**

```tsx
// en app/signup/page.tsx, agregar estado y campos:
const [tipoCrm, setTipoCrm] = useState<'ventas' | 'turnos'>('turnos');
const [rubro, setRubro] = useState('');

const RUBROS_TURNOS = ['cancha_padel', 'cancha_futbol', 'cancha_tenis', 'gimnasio', 'barberia', 'unas_pestanas', 'estetica', 'salud_belleza', 'odontologia'];
const RUBROS_VENTAS = ['mayorista', 'pet_shop', 'suplementos_gimnasio', 'alimentos_congelados', 'panificados', 'pastas', 'viajes_turismo', 'electronica', 'computacion'];

// en el <form>, agregar antes del submit:
<div className="flex flex-col gap-1">
  <label className="text-sm font-medium text-text-secondary">Tipo de negocio</label>
  <select value={tipoCrm} onChange={(e) => setTipoCrm(e.target.value as 'ventas' | 'turnos')}
    className="h-10 rounded-sm border border-border px-3">
    <option value="turnos">Turnos y citas</option>
    <option value="ventas">Ventas y productos</option>
  </select>
</div>
<div className="flex flex-col gap-1">
  <label className="text-sm font-medium text-text-secondary">Rubro</label>
  <select value={rubro} onChange={(e) => setRubro(e.target.value)}
    className="h-10 rounded-sm border border-border px-3">
    <option value="">Seleccioná tu rubro</option>
    {(tipoCrm === 'turnos' ? RUBROS_TURNOS : RUBROS_VENTAS).map((r) => (
      <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
    ))}
  </select>
</div>

// y en options.data del signUp():
options: { data: { nombre_negocio: nombreNegocio || undefined, tipo_crm: tipoCrm, rubro: rubro || undefined } },
```

- [ ] **Step 4: `tsc --noEmit` limpio, server levanta, `/signup` responde 200**

Run: `npx tsc --noEmit`
Run (server): `pnpm dev` en background, `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/signup`
Expected: 0 errores de tipos, HTTP 200

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/signup supabase/migrations
git commit -m "feat(auth): signup pide tipo_crm y rubro, trigger actualizado"
```

---

## Task 9: Regenerar tipos TypeScript desde el schema actualizado

**Files:**
- Modify: `apps/web/lib/supabase/types_db.ts`

**Interfaces:**
- Consumes: schema completo actualizado (Tasks 1-6)
- Produces: tipos reales para `negocio` (con tipo_crm, rubro, tier premium, facturación), `negocio_feature_overrides`, `clientes` — consumidos por toda la UI de C, B y D

- [ ] **Step 1: Generar los tipos vía Supabase MCP**

Usar `mcp__Supabase__generate_typescript_types` con `project_id: "afleydeeytyfgpytlimm"`.

- [ ] **Step 2: Reemplazar el contenido de `types_db.ts` con el output generado**

- [ ] **Step 3: `tsc --noEmit` limpio**

Run: `npx tsc --noEmit`
Expected: 0 errores (esto confirma que ningún código existente asumía la forma vieja del tipo `negocio`)

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/supabase/types_db.ts
git commit -m "chore(types): regenerar types_db.ts con schema actualizado (tiers, facturación, clientes)"
```

---

## Self-Review Checklist (completar al terminar la fase)

**1. Cobertura del spec** — verificar contra `docs/superpowers/specs/2026-09-14-fundacion-rubro-tiers-design.md`:
- [ ] `tipo_crm` + `rubro` en negocio (Task 1)
- [ ] Tier acepta `premium` con el swap correcto (Task 2, verificado en `features.ts` Task 4)
- [ ] Feature-gating híbrido con `hasFeature()` testeado (Task 4)
- [ ] Columnas de facturación mensual/anual (Task 5)
- [ ] Tabla `clientes` + memoria cross-conversación funcionando (Tasks 6-7)
- [ ] Signup actualizado (Task 8)
- [ ] Tipos TS regenerados (Task 9)

**2. Placeholder scan**: repasado, sin TODOs pendientes fuera de lo explícitamente diferido al spec (resumen con IA, panel admin, pricing real).

**Próxima fase:** Sub-proyecto C (CRM Turnos/Citas) — requiere brainstorming propio antes de escribir el plan, según el orden acordado A → C → B → D.
