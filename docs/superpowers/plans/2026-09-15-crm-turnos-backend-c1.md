# CRM Turnos/Citas — Backend (C1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el schema, las tools del agente y la lógica de negocio (lista de espera, guardrail de 24hs, reglas de reprogramación) del CRM de Turnos. La UI de calendario queda para un plan aparte (C2).

**Architecture:** Migraciones SQL vía Supabase MCP (mismo patrón que A y Fases 1-3). Las 2 tools nuevas siguen exactamente el patrón de aislamiento multi-tenant explícito de `tool-handlers.ts` (Fase 3). La lógica de lista de espera vive en un handler de backend separado, no en una tool que el modelo invoque directamente.

**Tech Stack:** Next.js 16, TypeScript, Supabase (Postgres + RLS), Vitest.

## Global Constraints

- Todas las tablas nuevas llevan `tenant_id UUID NOT NULL` + policy RLS `tenant_id = (select auth.uid())`
- Toda query dentro de tool handlers filtra `tenant_id` explícitamente en el código (no confiar solo en RLS — el webhook usa `service_role`)
- Después de cada migración: `get_advisors` (security + performance), resolver warnings antes de cerrar la task
- TDD: test primero (debe fallar), implementación, test pasa, commit
- Las 4 features nuevas se agregan a `PRO_FEATURES` en `apps/web/lib/plans/features.ts` (creado en sub-proyecto A) — no se toca la lógica de `hasFeature()`

---

## File Structure

```
supabase/migrations/
  0012_servicios.sql
  0013_recursos.sql
  0014_citas_extension.sql
  0015_lista_espera.sql
  0016_recordatorios_config.sql
  0017_reglas_reprogramacion.sql
  0018_negocio_plantillas_meta.sql

apps/web/lib/plans/
  features.ts                  # modificar: agregar 4 features nuevas a PRO_FEATURES

apps/web/lib/agent/
  tools.ts                     # modificar: agregar reprogramar_cita, anotar_lista_espera
  tools.test.ts                # agregar casos
  tool-handlers.ts              # modificar: agregar los 2 handlers nuevos
  tool-handlers.test.ts         # agregar casos

apps/web/lib/turnos/
  waitlist-notifier.ts          # lógica de backend: al cancelar cita, notifica lista de espera
  waitlist-notifier.test.ts
  reminder-guardrail.ts         # valida reglas de recordatorio contra ventana 24hs
  reminder-guardrail.test.ts
```

---

## Task 1: Migración — servicios

**Files:**
- Create: `supabase/migrations/0012_servicios.sql`

**Interfaces:**
- Consumes: `negocio.tenant_id`
- Produces: tabla consumida por `citas.servicio_id` (Task 3) y por las tools (Task 8)

- [ ] **Step 1: Aplicar la migración vía Supabase MCP**

```sql
create table servicios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  nombre text not null,
  duracion_minutos int not null,
  precio numeric not null,
  promociones jsonb not null default '[]'::jsonb,
  horario_override jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_servicios_tenant on servicios(tenant_id);

alter table servicios enable row level security;
create policy tenant_isolation_servicios on servicios
  using (tenant_id = (select auth.uid()));
```

Usar `mcp__Supabase__apply_migration`, `name: "servicios"`, `project_id: "afleydeeytyfgpytlimm"`.

- [ ] **Step 2: Verificar con query de sistema**

```sql
select table_name from information_schema.tables where table_name = 'servicios';
select policyname from pg_policies where tablename = 'servicios';
```

Expected: la tabla existe, 1 policy.

- [ ] **Step 3: `get_advisors` security — confirmar sin warnings nuevos**

- [ ] **Step 4: Guardar migración local y commit**

```bash
git add supabase/migrations/0012_servicios.sql
git commit -m "feat(db): tabla servicios (duración variable, promociones, horario propio)"
```

---

## Task 2: Migración — recursos

**Files:**
- Create: `supabase/migrations/0013_recursos.sql`

**Interfaces:**
- Produces: tabla consumida por `citas.recurso_id` (Task 3) y por las tools (Task 8)

- [ ] **Step 1: Aplicar la migración**

```sql
create table recursos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  nombre text not null,
  subtipo text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_recursos_tenant on recursos(tenant_id);

alter table recursos enable row level security;
create policy tenant_isolation_recursos on recursos
  using (tenant_id = (select auth.uid()));
```

- [ ] **Step 2: `get_advisors` security — confirmar sin warnings nuevos**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0013_recursos.sql
git commit -m "feat(db): tabla recursos (canchas/sillones/profesionales reservables en paralelo)"
```

---

## Task 3: Migración — extensión de citas

**Files:**
- Create: `supabase/migrations/0014_citas_extension.sql`

**Interfaces:**
- Consumes: `servicios.id`, `recursos.id` (Tasks 1-2)
- Produces: `citas` con soporte completo para el flujo de turnos

- [ ] **Step 1: Aplicar la migración**

```sql
alter table citas add column servicio_id uuid references servicios(id);
alter table citas add column recurso_id uuid references recursos(id);
alter table citas add column sena_requerida boolean not null default false;
alter table citas add column sena_pagada boolean not null default false;
alter table citas add column sena_metodo text check (sena_metodo in ('manual', 'mercadopago'));

alter table citas drop constraint citas_estado_check;
alter table citas add constraint citas_estado_check
  check (estado in ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_show', 'reprogramada'));
```

- [ ] **Step 2: Verificar el constraint actualizado**

```sql
select pg_get_constraintdef(oid) from pg_constraint where conname = 'citas_estado_check';
```

Expected: incluye `'no_show'` y `'reprogramada'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0014_citas_extension.sql
git commit -m "feat(db): extender citas con servicio, recurso, seña y estados no_show/reprogramada"
```

---

## Task 4: Migración — lista_espera

**Files:**
- Create: `supabase/migrations/0015_lista_espera.sql`

- [ ] **Step 1: Aplicar la migración**

```sql
create table lista_espera (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  phone text not null,
  servicio_id uuid references servicios(id),
  recurso_id uuid references recursos(id),
  franja_horaria_deseada jsonb not null,
  estado text not null default 'esperando' check (estado in ('esperando', 'notificado', 'confirmado', 'vencido')),
  created_at timestamptz not null default now()
);

create index idx_lista_espera_tenant on lista_espera(tenant_id);
create index idx_lista_espera_estado on lista_espera(tenant_id, estado);

alter table lista_espera enable row level security;
create policy tenant_isolation_lista_espera on lista_espera
  using (tenant_id = (select auth.uid()));
```

- [ ] **Step 2: `get_advisors` security — confirmar sin warnings nuevos**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0015_lista_espera.sql
git commit -m "feat(db): tabla lista_espera con opt-in para huecos liberados"
```

---

## Task 5: Migración — recordatorios_config y reglas_reprogramacion

**Files:**
- Create: `supabase/migrations/0016_recordatorios_config.sql`
- Create: `supabase/migrations/0017_reglas_reprogramacion.sql`

- [ ] **Step 1: Aplicar recordatorios_config**

```sql
create table recordatorios_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  minutos_antes int not null,
  mensaje_template text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table recordatorios_config enable row level security;
create policy tenant_isolation_recordatorios_config on recordatorios_config
  using (tenant_id = (select auth.uid()));
```

- [ ] **Step 2: Aplicar reglas_reprogramacion**

```sql
create table reglas_reprogramacion (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  horas_minimas_anticipacion int not null default 24,
  permite_sin_perder_sena boolean not null default true,
  created_at timestamptz not null default now()
);

alter table reglas_reprogramacion enable row level security;
create policy tenant_isolation_reglas_reprogramacion on reglas_reprogramacion
  using (tenant_id = (select auth.uid()));
```

- [ ] **Step 3: `get_advisors` security — confirmar sin warnings nuevos**

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0016_recordatorios_config.sql supabase/migrations/0017_reglas_reprogramacion.sql
git commit -m "feat(db): recordatorios_config (alertas configurables) y reglas_reprogramacion"
```

---

## Task 6: Migración — negocio.plantillas_meta_habilitadas

**Files:**
- Create: `supabase/migrations/0018_negocio_plantillas_meta.sql`

- [ ] **Step 1: Aplicar la migración**

```sql
alter table negocio add column plantillas_meta_habilitadas boolean not null default false;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0018_negocio_plantillas_meta.sql
git commit -m "feat(db): negocio.plantillas_meta_habilitadas (guardrail de recordatorios fuera de 24hs)"
```

---

## Task 7: Features nuevas de Pro en hasFeature()

**Files:**
- Modify: `apps/web/lib/plans/features.ts`
- Modify: `apps/web/lib/plans/features.test.ts`

**Interfaces:**
- Consumes: función `hasFeature()` ya existente (sub-proyecto A) — no se modifica su lógica
- Produces: 4 `FeatureKey` nuevas disponibles desde tier Pro

- [ ] **Step 1: Agregar tests para las 4 features nuevas**

```ts
// agregar a features.test.ts:
it('tier pro tiene las 4 features nuevas de turnos', () => {
  expect(hasFeature('pro', [], 'recordatorios_configurables')).toBe(true);
  expect(hasFeature('pro', [], 'lista_espera_automatica')).toBe(true);
  expect(hasFeature('pro', [], 'reprogramacion_self_service')).toBe(true);
  expect(hasFeature('pro', [], 'gestion_senas')).toBe(true);
});

it('tier base NO tiene las features de turnos avanzadas', () => {
  expect(hasFeature('base', [], 'recordatorios_configurables')).toBe(false);
  expect(hasFeature('base', [], 'lista_espera_automatica')).toBe(false);
});
```

- [ ] **Step 2: Correr, debe fallar** (los `FeatureKey` no existen todavía en el tipo)

Run: `cd apps/web && npx vitest run lib/plans/features.test.ts`
Expected: FAIL — TypeScript error o test failure

- [ ] **Step 3: Agregar las 4 keys al tipo y a PRO_FEATURES**

```ts
// en el union type FeatureKey, agregar:
  | 'recordatorios_configurables'
  | 'lista_espera_automatica'
  | 'reprogramacion_self_service'
  | 'gestion_senas'

// en PRO_FEATURES, agregar junto a las existentes:
const PRO_FEATURES: FeatureKey[] = [
  ...BASE_FEATURES,
  'combos_promociones',
  'descuentos_configurables',
  'saludo_cumpleanos',
  'turnos_fijos_mensualizados',
  'cuenta_corriente',
  'recordatorios_configurables',
  'lista_espera_automatica',
  'reprogramacion_self_service',
  'gestion_senas',
];
```

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run lib/plans/features.test.ts`
Expected: PASS (9 tests — los 7 anteriores + 2 nuevos)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/plans
git commit -m "feat(plans): agregar 4 features de turnos a tier Pro"
```

---

## Task 8: Tools nuevas — reprogramar_cita y anotar_lista_espera

**Files:**
- Modify: `apps/web/lib/agent/tools.ts`
- Modify: `apps/web/lib/agent/tools.test.ts`
- Modify: `apps/web/lib/agent/tool-handlers.ts`
- Modify: `apps/web/lib/agent/tool-handlers.test.ts`

**Interfaces:**
- Consumes: `servicios`, `recursos`, `lista_espera`, `reglas_reprogramacion` (Tasks 1-5)
- Produces: 2 tools nuevas disponibles para el agente, con el mismo aislamiento multi-tenant explícito que las 5 existentes

- [ ] **Step 1: Test de definición de las tools (deben aparecer en getToolsForTier)**

```ts
// agregar a tools.test.ts:
it('tier base incluye reprogramar_cita y anotar_lista_espera (agendar es base, pero requieren Pro para ejecutarse — el gating real vive en el handler)', () => {
  // Nota: las tools SIEMPRE se ofrecen (el modelo necesita saber que existen para
  // poder informarle al cliente "necesitás Pro para esto"), el bloqueo real por
  // tier vive en el handler, igual que procesar_pago.
  const tools = getToolsForTier('base');
  const names = tools.map((t) => t.function.name);
  expect(names).toEqual(expect.arrayContaining(['reprogramar_cita', 'anotar_lista_espera']));
});
```

- [ ] **Step 2: Correr, debe fallar**

- [ ] **Step 3: Agregar las definiciones en tools.ts**

```ts
const reprogramar_cita: ToolDefinition = {
  type: 'function',
  function: {
    name: 'reprogramar_cita',
    description: 'Reprograma una cita existente a una nueva fecha y hora, validando las reglas de anticipación del negocio.',
    parameters: {
      type: 'object',
      properties: {
        cita_id: { type: 'string', description: 'ID de la cita a reprogramar' },
        nueva_fecha: { type: 'string', description: 'Nueva fecha en formato YYYY-MM-DD' },
        nueva_hora: { type: 'string', description: 'Nueva hora en formato HH:MM' },
      },
      required: ['cita_id', 'nueva_fecha', 'nueva_hora'],
    },
  },
};

const anotar_lista_espera: ToolDefinition = {
  type: 'function',
  function: {
    name: 'anotar_lista_espera',
    description: 'Anota al cliente en la lista de espera cuando no hay disponibilidad en la franja horaria pedida.',
    parameters: {
      type: 'object',
      properties: {
        servicio_id: { type: 'string', description: 'ID del servicio deseado' },
        fecha: { type: 'string', description: 'Fecha deseada YYYY-MM-DD' },
        hora_desde: { type: 'string', description: 'Inicio de la franja horaria aceptable HH:MM' },
        hora_hasta: { type: 'string', description: 'Fin de la franja horaria aceptable HH:MM' },
      },
      required: ['servicio_id', 'fecha', 'hora_desde', 'hora_hasta'],
    },
  },
};

// agregar ambas a BASE_TOOLS (se ofrecen siempre, el gating fino vive en el handler)
const BASE_TOOLS = [consultar_disponibilidad, registrar_cita, obtener_catalogo, reprogramar_cita, anotar_lista_espera];
```

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run lib/agent/tools.test.ts`

- [ ] **Step 5: Tests de los handlers — aislamiento multi-tenant + gating por feature**

```ts
// agregar a tool-handlers.test.ts:
it('reprogramar_cita filtra explícitamente por tenant_id al actualizar', async () => {
  const { client, calls } = createMockSupabase({ data: { id: 'cita-1' }, error: null });
  await executeToolCall(
    'reprogramar_cita',
    { cita_id: 'cita-1', nueva_fecha: '2026-10-05', nueva_hora: '15:00' },
    { tenantId: TENANT_A, tier: 'pro', supabase: client }
  );
  const eqCalls = calls.filter((c) => c.method === 'eq');
  expect(eqCalls.some((c) => c.args[0] === 'tenant_id' && c.args[1] === TENANT_A)).toBe(true);
});

it('reprogramar_cita es rechazada si el tier es base (feature de Pro)', async () => {
  const { client } = createMockSupabase({ data: null, error: null });
  const result = await executeToolCall(
    'reprogramar_cita',
    { cita_id: 'cita-1', nueva_fecha: '2026-10-05', nueva_hora: '15:00' },
    { tenantId: TENANT_A, tier: 'base', supabase: client }
  );
  expect(result.error).toBeDefined();
  expect(result.error).toMatch(/tier|pro|no disponible/i);
});

it('anotar_lista_espera inserta con tenant_id seteado explícitamente', async () => {
  const { client, calls } = createMockSupabase({ data: { id: '1' }, error: null });
  await executeToolCall(
    'anotar_lista_espera',
    { servicio_id: 'serv-1', fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' },
    { tenantId: TENANT_A, tier: 'pro', supabase: client }
  );
  const insertCall = calls.find((c) => c.method === 'insert');
  const payload = insertCall!.args[0] as { tenant_id: string };
  expect(payload.tenant_id).toBe(TENANT_A);
});
```

- [ ] **Step 6: Correr, debe fallar**

- [ ] **Step 7: Implementar los handlers en tool-handlers.ts**

```ts
async function reprogramarCita(
  args: { cita_id: string; nueva_fecha: string; nueva_hora: string },
  ctx: ToolContext
): Promise<ToolResult> {
  if (ctx.tier === 'base') {
    return { error: 'Reprogramar turnos no está disponible en tu tier. Necesitás el plan Pro.' };
  }

  const { data, error } = await ctx.supabase
    .from('citas')
    .update({ fecha: args.nueva_fecha, hora: args.nueva_hora, estado: 'reprogramada' })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', args.cita_id)
    .select()
    .single();

  if (error) return { error: 'No se pudo reprogramar la cita' };
  return { data };
}

async function anotarListaEspera(
  args: { servicio_id: string; fecha: string; hora_desde: string; hora_hasta: string },
  ctx: ToolContext
): Promise<ToolResult> {
  if (ctx.tier === 'base') {
    return { error: 'La lista de espera no está disponible en tu tier. Necesitás el plan Pro.' };
  }

  const { data, error } = await ctx.supabase
    .from('lista_espera')
    .insert({
      tenant_id: ctx.tenantId,
      phone: ctx.phone, // ver nota Step 8 sobre agregar phone al ToolContext
      servicio_id: args.servicio_id,
      franja_horaria_deseada: { fecha: args.fecha, hora_desde: args.hora_desde, hora_hasta: args.hora_hasta },
    })
    .select()
    .single();

  if (error) return { error: 'No se pudo anotar en la lista de espera' };
  return { data };
}

// agregar los casos al switch de executeToolCall:
case 'reprogramar_cita':
  return reprogramarCita(args as { cita_id: string; nueva_fecha: string; nueva_hora: string }, ctx);
case 'anotar_lista_espera':
  return anotarListaEspera(args as { servicio_id: string; fecha: string; hora_desde: string; hora_hasta: string }, ctx);
```

- [ ] **Step 8: Agregar `phone` al `ToolContext`** (necesario para `anotar_lista_espera`, que hoy no lo tiene — `consultar_disponibilidad` y las demás no lo necesitaban)

```ts
// en tool-handlers.ts, actualizar la interfaz:
interface ToolContext {
  tenantId: string;
  tier: 'base' | 'pro';
  phone: string; // agregado — necesario para anotar_lista_espera
  supabase: any;
}
```

Actualizar también `handle-incoming-message.ts` donde se arma el contexto para pasar
`phone: incoming.from`, y el route handler real (`app/api/webhooks/whatsapp/route.ts`)
en el `executeToolCall` wrapper.

- [ ] **Step 9: Correr toda la suite del agente, debe pasar**

Run: `npx vitest run lib/agent/`
Expected: todos los tests en verde, incluidos los ya existentes de Fase 3 (no deben romperse)

- [ ] **Step 10: `tsc --noEmit` limpio**

Run: `npx tsc --noEmit`

- [ ] **Step 11: Commit**

```bash
git add apps/web/lib/agent
git commit -m "feat(agent): tools reprogramar_cita y anotar_lista_espera con gating por tier Pro"
```

---

## Task 9: Lógica de notificación de lista de espera

**Files:**
- Create: `apps/web/lib/turnos/waitlist-notifier.ts`
- Create: `apps/web/lib/turnos/waitlist-notifier.test.ts`

**Interfaces:**
- Consumes: `lista_espera` (Task 4)
- Produces: función pura `findNextWaitlistCandidate(entries, canceledCita)` — testeada de forma aislada, sin llamar a Supabase directamente (se le inyecta la lista ya cargada, siguiendo el mismo patrón de dependency injection que `handle-incoming-message.ts`)

- [ ] **Step 1: Escribir los tests**

```ts
// waitlist-notifier.test.ts
import { describe, it, expect } from 'vitest';
import { findNextWaitlistCandidate } from './waitlist-notifier';

describe('findNextWaitlistCandidate', () => {
  it('devuelve el primero en orden de llegada que coincide en servicio y franja', () => {
    const entries = [
      { id: '1', servicio_id: 'serv-1', recurso_id: null, estado: 'esperando', created_at: '2026-09-01T10:00:00Z', franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' } },
      { id: '2', servicio_id: 'serv-1', recurso_id: null, estado: 'esperando', created_at: '2026-09-02T10:00:00Z', franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' } },
    ];
    const canceled = { servicio_id: 'serv-1', recurso_id: 'recurso-1', fecha: '2026-10-05', hora: '15:00' };
    const result = findNextWaitlistCandidate(entries, canceled);
    expect(result?.id).toBe('1');
  });

  it('ignora entradas que no están en estado esperando', () => {
    const entries = [
      { id: '1', servicio_id: 'serv-1', recurso_id: null, estado: 'notificado', created_at: '2026-09-01T10:00:00Z', franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' } },
    ];
    const canceled = { servicio_id: 'serv-1', recurso_id: 'recurso-1', fecha: '2026-10-05', hora: '15:00' };
    expect(findNextWaitlistCandidate(entries, canceled)).toBeNull();
  });

  it('ignora entradas de otro servicio', () => {
    const entries = [
      { id: '1', servicio_id: 'serv-OTRO', recurso_id: null, estado: 'esperando', created_at: '2026-09-01T10:00:00Z', franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' } },
    ];
    const canceled = { servicio_id: 'serv-1', recurso_id: 'recurso-1', fecha: '2026-10-05', hora: '15:00' };
    expect(findNextWaitlistCandidate(entries, canceled)).toBeNull();
  });

  it('respeta un recurso_id específico pedido (ej. su barbero de confianza)', () => {
    const entries = [
      { id: '1', servicio_id: 'serv-1', recurso_id: 'recurso-DISTINTO', estado: 'esperando', created_at: '2026-09-01T10:00:00Z', franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' } },
      { id: '2', servicio_id: 'serv-1', recurso_id: 'recurso-1', estado: 'esperando', created_at: '2026-09-02T10:00:00Z', franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' } },
    ];
    const canceled = { servicio_id: 'serv-1', recurso_id: 'recurso-1', fecha: '2026-10-05', hora: '15:00' };
    // la entrada 1 pidió un recurso distinto al que se liberó — no aplica.
    // la entrada 2 pidió justo el recurso que se liberó — aplica, aunque llegó después.
    expect(findNextWaitlistCandidate(entries, canceled)?.id).toBe('2');
  });

  it('la hora cancelada debe caer dentro de la franja deseada', () => {
    const entries = [
      { id: '1', servicio_id: 'serv-1', recurso_id: null, estado: 'esperando', created_at: '2026-09-01T10:00:00Z', franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '09:00', hora_hasta: '12:00' } },
    ];
    const canceled = { servicio_id: 'serv-1', recurso_id: 'recurso-1', fecha: '2026-10-05', hora: '15:00' };
    expect(findNextWaitlistCandidate(entries, canceled)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr, debe fallar**

- [ ] **Step 3: Implementar**

```ts
// waitlist-notifier.ts
interface WaitlistEntry {
  id: string;
  servicio_id: string;
  recurso_id: string | null;
  estado: string;
  created_at: string;
  franja_horaria_deseada: { fecha: string; hora_desde: string; hora_hasta: string };
}

interface CanceledCita {
  servicio_id: string;
  recurso_id: string;
  fecha: string;
  hora: string;
}

export function findNextWaitlistCandidate(
  entries: WaitlistEntry[],
  canceled: CanceledCita
): WaitlistEntry | null {
  const candidates = entries
    .filter((e) => e.estado === 'esperando')
    .filter((e) => e.servicio_id === canceled.servicio_id)
    .filter((e) => e.recurso_id === null || e.recurso_id === canceled.recurso_id)
    .filter((e) => e.franja_horaria_deseada.fecha === canceled.fecha)
    .filter(
      (e) =>
        canceled.hora >= e.franja_horaria_deseada.hora_desde &&
        canceled.hora <= e.franja_horaria_deseada.hora_hasta
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return candidates[0] ?? null;
}
```

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run lib/turnos/waitlist-notifier.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/turnos/waitlist-notifier.ts apps/web/lib/turnos/waitlist-notifier.test.ts
git commit -m "feat(turnos): findNextWaitlistCandidate — selección del próximo candidato en lista de espera"
```

---

## Task 10: Guardrail de recordatorios fuera de la ventana de 24hs

**Files:**
- Create: `apps/web/lib/turnos/reminder-guardrail.ts`
- Create: `apps/web/lib/turnos/reminder-guardrail.test.ts`

**Interfaces:**
- Produces: función pura `checkReminderGuardrail(minutosAntes, plantillasHabilitadas)` — usada por la UI de configuración de recordatorios (C2, plan aparte) para decidir si mostrar el ícono de alerta

- [ ] **Step 1: Escribir los tests**

```ts
import { describe, it, expect } from 'vitest';
import { checkReminderGuardrail } from './reminder-guardrail';

describe('checkReminderGuardrail', () => {
  it('una regla dentro de las 24hs (1440 min) nunca requiere alerta', () => {
    expect(checkReminderGuardrail(1440, false).requiereAlerta).toBe(false);
    expect(checkReminderGuardrail(120, false).requiereAlerta).toBe(false);
  });

  it('una regla de más de 24hs sin plantillas habilitadas requiere alerta', () => {
    const result = checkReminderGuardrail(2880, false); // 48hs antes
    expect(result.requiereAlerta).toBe(true);
    expect(result.motivo).toMatch(/plantilla|24/i);
  });

  it('una regla de más de 24hs CON plantillas habilitadas no requiere alerta', () => {
    expect(checkReminderGuardrail(2880, true).requiereAlerta).toBe(false);
  });

  it('exactamente 1440 minutos (el límite) no requiere alerta', () => {
    expect(checkReminderGuardrail(1440, false).requiereAlerta).toBe(false);
  });

  it('1441 minutos (un minuto pasado el límite) sí requiere alerta sin plantillas', () => {
    expect(checkReminderGuardrail(1441, false).requiereAlerta).toBe(true);
  });
});
```

- [ ] **Step 2: Correr, debe fallar**

- [ ] **Step 3: Implementar**

```ts
interface GuardrailResult {
  requiereAlerta: boolean;
  motivo?: string;
}

const VENTANA_24HS_MINUTOS = 1440;

export function checkReminderGuardrail(
  minutosAntes: number,
  plantillasMetaHabilitadas: boolean
): GuardrailResult {
  if (minutosAntes <= VENTANA_24HS_MINUTOS) {
    return { requiereAlerta: false };
  }

  if (plantillasMetaHabilitadas) {
    return { requiereAlerta: false };
  }

  return {
    requiereAlerta: true,
    motivo: 'Este recordatorio cae fuera de la ventana de 24hs de WhatsApp y necesita una plantilla aprobada por Meta para funcionar.',
  };
}
```

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run lib/turnos/reminder-guardrail.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/turnos/reminder-guardrail.ts apps/web/lib/turnos/reminder-guardrail.test.ts
git commit -m "feat(turnos): checkReminderGuardrail — detecta reglas que necesitan plantilla de Meta"
```

---

## Task 11: Regenerar tipos TypeScript

**Files:**
- Modify: `apps/web/lib/supabase/types_db.ts`

- [ ] **Step 1: Generar vía `mcp__Supabase__generate_typescript_types`**

- [ ] **Step 2: Reemplazar el contenido de `types_db.ts`**

- [ ] **Step 3: `tsc --noEmit` limpio + suite completa del monorepo**

Run: `npx tsc --noEmit && npx vitest run` (en `apps/web`), y `npx vitest run` en `packages/design-tokens`
Expected: 0 errores, todos los tests en verde

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/supabase/types_db.ts
git commit -m "chore(types): regenerar types_db.ts con schema de turnos (servicios, recursos, lista_espera, etc.)"
```

---

## Self-Review Checklist (completar al terminar C1)

**1. Cobertura del spec** — verificar contra `docs/superpowers/specs/2026-09-15-crm-turnos-citas-design.md`:
- [ ] Las 6 tablas nuevas + extensión de `citas` (Tasks 1-6)
- [ ] Las 4 features nuevas de Pro (Task 7)
- [ ] Las 2 tools con aislamiento multi-tenant y gating por tier (Task 8)
- [ ] Lógica de lista de espera testeada de forma aislada (Task 9)
- [ ] Guardrail de 24hs testeado (Task 10)
- [ ] Tipos regenerados (Task 11)

**2. Placeholder scan**: sin TODOs pendientes fuera de lo explícitamente diferido
(UI de calendario → C2, activación de plantillas Meta → D, aprobación real en
Meta Business Manager → proceso externo).

**Próximo:** C2 (Frontend: calendario, tarjetas de turnos, páginas de gestión de
servicios/recursos/recordatorios) — plan aparte, mismo patrón.
