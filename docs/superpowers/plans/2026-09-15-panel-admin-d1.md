# Panel Admin (D1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el panel de administración de la plataforma: autenticación separada de los tenants, estados granulares de negocio con enforcement real en el webhook, tabla de facturación propia, y las páginas base para gestionar todo esto.

**Architecture:** Auth de admin 100% independiente de Supabase Auth de tenants — hash de password y token de sesión firmado con `node:crypto` (sin librerías nuevas), verificado en una rama separada de `proxy.ts`. Las queries del panel usan `createServiceClient()` (ya existente desde Fase 3).

**Tech Stack:** Next.js 16, TypeScript, Supabase (Postgres + RLS + service_role), Vitest, `node:crypto`.

## Global Constraints

- El mecanismo de auth de admin NUNCA debe compartir código de verificación con el de tenants (son sistemas distintos a propósito, por seguridad)
- `facturacion_negocio` y `admins` solo se acceden vía `service_client` — ninguna policy de RLS habilita acceso `anon`/`authenticated`
- Después de cada migración: `get_advisors` (security + performance), resolver warnings antes de cerrar la task
- TDD para toda función pura (hash, token, enforcement de estado_cuenta); páginas se verifican con smoke test

---

## File Structure

```
supabase/migrations/
  0023_admins.sql
  0024_negocio_estado_cuenta.sql
  0025_facturacion_negocio.sql

apps/web/lib/admin/
  hash-password.ts
  hash-password.test.ts
  session-token.ts
  session-token.test.ts

apps/web/app/api/admin/login/route.ts
apps/web/app/admin/login/page.tsx
apps/web/app/admin/page.tsx
apps/web/app/admin/negocios/page.tsx
apps/web/app/admin/negocios/[id]/page.tsx

apps/web/proxy.ts                          # modificar: rama separada para /admin
apps/web/app/api/webhooks/whatsapp/route.ts  # modificar: chequear estado_cuenta
```

---

## Task 1: Migración — tabla admins

**Files:**
- Create: `supabase/migrations/0023_admins.sql`

- [ ] **Step 1: Aplicar la migración**

```sql
create table admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;
-- Sin policies para anon/authenticated: deny by default. Solo el service_role
-- (que bypasea RLS) puede leer/escribir esta tabla — nunca se expone vía la
-- API pública de Supabase a usuarios normales.
```

- [ ] **Step 2: Verificar y correr `get_advisors` (security)** — prestar atención
si marca "RLS enabled sin policies" como advertencia; si aparece, es esperado
y intencional (deny-by-default), documentarlo en el commit.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0023_admins.sql
git commit -m "feat(db): tabla admins con RLS deny-by-default (solo service_role accede)"
```

---

## Task 2: Migración — negocio.estado_cuenta

**Files:**
- Create: `supabase/migrations/0024_negocio_estado_cuenta.sql`

- [ ] **Step 1: Aplicar la migración**

```sql
alter table negocio add column estado_cuenta text not null default 'activo'
  check (estado_cuenta in ('activo', 'suspendido_pago', 'baja_definitiva'));
```

- [ ] **Step 2: Verificar**

```sql
select pg_get_constraintdef(oid) from pg_constraint where conname like '%estado_cuenta%';
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0024_negocio_estado_cuenta.sql
git commit -m "feat(db): negocio.estado_cuenta (activo/suspendido_pago/baja_definitiva)"
```

---

## Task 3: Migración — facturacion_negocio

**Files:**
- Create: `supabase/migrations/0025_facturacion_negocio.sql`

- [ ] **Step 1: Aplicar la migración**

```sql
create table facturacion_negocio (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  concepto text not null,
  monto numeric not null,
  fecha date not null,
  created_at timestamptz not null default now()
);

create index idx_facturacion_negocio_tenant on facturacion_negocio(tenant_id);

alter table facturacion_negocio enable row level security;
-- Deny-by-default, mismo criterio que admins: solo service_role accede.
```

- [ ] **Step 2: `get_advisors` security + performance — confirmar sin warnings nuevos no esperados**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0025_facturacion_negocio.sql
git commit -m "feat(db): tabla facturacion_negocio (deny-by-default, solo admin)"
```

---

## Task 4: hashPassword / verifyPassword

**Files:**
- Create: `apps/web/lib/admin/hash-password.ts`
- Create: `apps/web/lib/admin/hash-password.test.ts`

**Interfaces:**
- Produces: `hashPassword(plain): Promise<string>`, `verifyPassword(plain, hash): Promise<boolean>` — usados por el login de admin (Task 6)

- [ ] **Step 1: Escribir los tests**

```ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './hash-password';

describe('hashPassword / verifyPassword', () => {
  it('un password verificado contra su propio hash da true', async () => {
    const hash = await hashPassword('MiPassword123!');
    expect(await verifyPassword('MiPassword123!', hash)).toBe(true);
  });

  it('un password incorrecto contra el hash da false', async () => {
    const hash = await hashPassword('MiPassword123!');
    expect(await verifyPassword('OtroPassword', hash)).toBe(false);
  });

  it('el hash nunca es igual al password en texto plano', async () => {
    const hash = await hashPassword('MiPassword123!');
    expect(hash).not.toBe('MiPassword123!');
  });

  it('dos hashes del mismo password son distintos entre sí (salt aleatorio)', async () => {
    const hash1 = await hashPassword('MiPassword123!');
    const hash2 = await hashPassword('MiPassword123!');
    expect(hash1).not.toBe(hash2);
  });
});
```

- [ ] **Step 2: Correr, debe fallar**

Run: `cd apps/web && npx vitest run lib/admin/hash-password.test.ts`

- [ ] **Step 3: Implementar con `node:crypto` scrypt (sin dependencias nuevas)**

```ts
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = (await scryptAsync(plain, salt, 64)) as Buffer;
  return keyBuffer.length === derivedKey.length && timingSafeEqual(keyBuffer, derivedKey);
}
```

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run lib/admin/hash-password.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/admin/hash-password.ts apps/web/lib/admin/hash-password.test.ts
git commit -m "feat(admin): hashPassword/verifyPassword con scrypt (node:crypto, sin deps nuevas)"
```

---

## Task 5: Token de sesión de admin firmado

**Files:**
- Create: `apps/web/lib/admin/session-token.ts`
- Create: `apps/web/lib/admin/session-token.test.ts`

**Interfaces:**
- Produces: `createSessionToken(adminId): string`, `verifySessionToken(token): { adminId: string } | null` — usados por el login (Task 6) y por `proxy.ts` (Task 7)

- [ ] **Step 1: Escribir los tests**

```ts
import { describe, it, expect, vi } from 'vitest';
import { createSessionToken, verifySessionToken } from './session-token';

describe('createSessionToken / verifySessionToken', () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'test-secret';
  });

  it('un token creado se verifica correctamente y devuelve el adminId', () => {
    const token = createSessionToken('admin-1');
    expect(verifySessionToken(token)).toEqual({ adminId: 'admin-1' });
  });

  it('un token manipulado (firma inválida) devuelve null', () => {
    const token = createSessionToken('admin-1');
    const tampered = token.slice(0, -2) + 'xx';
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it('un token con secret distinto al usado para verificar devuelve null', () => {
    const token = createSessionToken('admin-1');
    process.env.ADMIN_SESSION_SECRET = 'otro-secret';
    expect(verifySessionToken(token)).toBeNull();
  });

  it('un string cualquiera que no es un token válido devuelve null', () => {
    expect(verifySessionToken('esto-no-es-un-token')).toBeNull();
  });
});
```

- [ ] **Step 2: Correr, debe fallar**

- [ ] **Step 3: Implementar (HMAC sobre payload, mismo patrón que verify-signature.ts de Fase 3)**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

export function createSessionToken(adminId: string): string {
  const payload = Buffer.from(JSON.stringify({ adminId })).toString('base64url');
  const signature = createHmac('sha256', process.env.ADMIN_SESSION_SECRET!)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): { adminId: string } | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expectedSignature = createHmac('sha256', process.env.ADMIN_SESSION_SECRET!)
    .update(payload)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return { adminId: decoded.adminId };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run lib/admin/session-token.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/admin/session-token.ts apps/web/lib/admin/session-token.test.ts
git commit -m "feat(admin): session token firmado con HMAC (independiente de Supabase Auth)"
```

---

## Task 6: Route de login de admin

**Files:**
- Create: `apps/web/app/api/admin/login/route.ts`
- Create: `apps/web/app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `hashPassword`/`verifyPassword` (Task 4), `createSessionToken` (Task 5), tabla `admins` (Task 1)

- [ ] **Step 1: Implementar el route handler**

```ts
// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { verifyPassword } from '@/lib/admin/hash-password';
import { createSessionToken } from '@/lib/admin/session-token';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  const supabase = createServiceClient();

  const { data: admin } = await supabase
    .from('admins')
    .select('id, password_hash')
    .eq('email', email)
    .single();

  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const token = createSessionToken(admin.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 horas
  });
  return response;
}
```

- [ ] **Step 2: Implementar la página de login (Client Component simple, reusa Input/Button/Card)**

```tsx
// app/admin/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      setError('Credenciales inválidas');
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Panel Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p role="alert" className="text-sm text-error">{error}</p>}
            <Button type="submit">Ingresar</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/admin/login apps/web/app/admin/login
git commit -m "feat(admin): login de admin (route handler + página)"
```

---

## Task 7: Proteger /admin en proxy.ts (rama separada de la de tenants)

**Files:**
- Modify: `apps/web/proxy.ts`

**Interfaces:**
- Consumes: `verifySessionToken` (Task 5)

- [ ] **Step 1: Agregar la rama de admin, sin tocar la lógica existente de tenants**

```ts
// al inicio de proxy(), antes de la lógica de Supabase existente:
import { verifySessionToken } from '@/lib/admin/session-token';

// dentro de la función proxy, como rama independiente:
if (request.nextUrl.pathname.startsWith('/admin')) {
  if (request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next({ request });
  }
  const token = request.cookies.get('admin_session')?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request });
}

// ... resto de la función sigue igual para las rutas de tenants (/dashboard, /turnos, /login, /signup)
```

- [ ] **Step 2: Actualizar el `matcher` de `config` si hace falta** (verificar que `/admin/*` ya cae dentro del patrón existente — el matcher actual es amplio, probablemente no requiera cambios)

- [ ] **Step 3: Verificar manualmente**

Run: server levantado, `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin` → esperar 307 (redirect a `/admin/login`, sin cookie de sesión)

- [ ] **Step 4: Commit**

```bash
git add apps/web/proxy.ts
git commit -m "feat(admin): proteger /admin con sesión de admin separada del auth de tenants"
```

---

## Task 8: Enforcement de estado_cuenta en el webhook

**Files:**
- Modify: `apps/web/app/api/webhooks/whatsapp/route.ts`
- Modify: `apps/web/lib/agent/handle-incoming-message.ts`
- Modify: `apps/web/lib/agent/handle-incoming-message.test.ts`

**Interfaces:**
- Consumes: `negocio.estado_cuenta` (Task 2)

- [ ] **Step 1: Test — un negocio no activo no debe llegar a llamar a OpenRouter**

```ts
// agregar a handle-incoming-message.test.ts:
it('si el negocio no está activo (estado_cuenta), no se procesa el mensaje ni se llama a OpenRouter', async () => {
  const deps = makeDeps({
    findNegocioByPhoneNumberId: vi.fn().mockResolvedValue({ ...NEGOCIO_A, estado_cuenta: 'suspendido_pago' }),
  });
  const result = await handleIncomingMessage(
    { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
    deps
  );
  expect(deps.callOpenRouter).not.toHaveBeenCalled();
  expect(result.handled).toBe(false);
});
```

- [ ] **Step 2: Correr, debe fallar**

- [ ] **Step 3: Agregar el chequeo en `handleIncomingMessage`, justo después de encontrar el negocio**

```ts
// en handle-incoming-message.ts, después de:
// const negocio = await deps.findNegocioByPhoneNumberId(incoming.phoneNumberId);
// if (!negocio) { return { handled: false }; }
// agregar:
if (negocio.estado_cuenta && negocio.estado_cuenta !== 'activo') {
  return { handled: false };
}
```

Actualizar también la interfaz `NegocioLookup` para incluir `estado_cuenta?: string`.

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run lib/agent/handle-incoming-message.test.ts`

- [ ] **Step 5: Actualizar el route handler real para seleccionar `estado_cuenta` en el lookup**

```ts
// en app/api/webhooks/whatsapp/route.ts, en findNegocioByPhoneNumberId:
.select('*') // ya trae todas las columnas, incluyendo estado_cuenta — no requiere cambio si ya usa select('*')
```

(Verificar: si el select ya es `'*'`, este paso es solo de confirmación, no de cambio de código.)

- [ ] **Step 6: `tsc --noEmit` limpio + suite completa**

Run: `npx tsc --noEmit && npx vitest run`

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/agent apps/web/app/api/webhooks
git commit -m "feat(admin): enforcement de estado_cuenta — negocio suspendido no consume el agente"
```

---

## Task 9: Páginas /admin, /admin/negocios, /admin/negocios/[id]

**Files:**
- Create: `apps/web/app/admin/page.tsx`
- Create: `apps/web/app/admin/negocios/page.tsx`
- Create: `apps/web/app/admin/negocios/[id]/page.tsx`

- [ ] **Step 1: Implementar `/admin` (feed de vencimientos + resumen)**

```tsx
import { createServiceClient } from '@/lib/supabase/service-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { KPICard } from '@/components/ui/kpi-card';

export default async function AdminDashboardPage() {
  const supabase = createServiceClient();

  const en7dias = new Date();
  en7dias.setDate(en7dias.getDate() + 7);

  const { data: porVencer } = await supabase
    .from('negocio')
    .select('nombre, plan_fecha_vencimiento, estado_cuenta')
    .lte('plan_fecha_vencimiento', en7dias.toISOString().slice(0, 10))
    .eq('estado_cuenta', 'activo');

  const { count: totalActivos } = await supabase
    .from('negocio')
    .select('*', { count: 'exact', head: true })
    .eq('estado_cuenta', 'activo');

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Panel Admin</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <KPICard label="Negocios activos" value={totalActivos ?? 0} />
        <KPICard label="Por vencer (7 días)" value={porVencer?.length ?? 0} />
      </div>
      <h2 className="text-lg font-medium text-text-primary mb-3">Vencimientos próximos</h2>
      <div className="flex flex-col gap-2">
        {(porVencer ?? []).map((n, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>{n.nombre}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">Vence: {n.plan_fecha_vencimiento}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Implementar `/admin/negocios` (listado)**

```tsx
import { createServiceClient } from '@/lib/supabase/service-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function AdminNegociosPage() {
  const supabase = createServiceClient();
  const { data: negocios } = await supabase
    .from('negocio')
    .select('tenant_id, nombre, tipo_crm, rubro, tier, estado_cuenta')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Negocios</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(negocios ?? []).map((n) => (
          <a key={n.tenant_id} href={`/admin/negocios/${n.tenant_id}`}>
            <Card>
              <CardHeader>
                <CardTitle>{n.nombre}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">
                  {n.tipo_crm} · {n.rubro} · {n.tier} · {n.estado_cuenta}
                </p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Implementar `/admin/negocios/[id]` (detalle)**

```tsx
import { createServiceClient } from '@/lib/supabase/service-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function AdminNegocioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: negocio } = await supabase.from('negocio').select('*').eq('tenant_id', id).single();
  const { data: overrides } = await supabase
    .from('negocio_feature_overrides')
    .select('*')
    .eq('tenant_id', id);
  const { data: facturacion } = await supabase
    .from('facturacion_negocio')
    .select('*')
    .eq('tenant_id', id)
    .order('fecha', { ascending: false });

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">{negocio?.nombre}</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Tier: {negocio?.tier} · Cuenta: {negocio?.estado_cuenta}</p>
          <p className="text-sm text-text-secondary">Vence: {negocio?.plan_fecha_vencimiento ?? 'sin definir'}</p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Features activadas puntualmente</CardTitle>
        </CardHeader>
        <CardContent>
          {(overrides ?? []).length === 0 && (
            <p className="text-sm text-text-muted">Sin overrides activos.</p>
          )}
          {(overrides ?? []).map((o) => (
            <p key={o.id} className="text-sm">
              {o.feature_key}: {o.habilitado ? 'activado' : 'desactivado'}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de facturación</CardTitle>
        </CardHeader>
        <CardContent>
          {(facturacion ?? []).map((f) => (
            <p key={f.id} className="text-sm">
              {f.fecha} — {f.concepto}: ${f.monto}
            </p>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
```

Nota de alcance: los botones para activar/desactivar overrides, cambiar
`estado_cuenta`, y el date-picker de `plan_fecha_alta` (todos mencionados en
el spec) requieren Client Components con mutaciones — se agregan en una
iteración siguiente sobre esta base de lectura, mismo criterio usado entre
C1/C2.

- [ ] **Step 4: `tsc --noEmit` limpio + smoke test de las 3 páginas**

Run: `npx tsc --noEmit`, luego con el server levantado: `curl` a `/admin`, `/admin/negocios`, `/admin/negocios/algun-id` sin cookie → todas deben dar 307 a `/admin/login`

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin
git commit -m "feat(admin): páginas /admin, /admin/negocios, /admin/negocios/[id] (lectura)"
```

---

## Task 10: Crear el usuario admin real (Matías) y regenerar tipos

**Files:**
- Modify: `apps/web/lib/supabase/types_db.ts`

- [ ] **Step 1: Generar el hash de un password elegido por el usuario y crear la fila en `admins` vía Supabase MCP** (pedirle al usuario el email/password que quiere usar, nunca hardcodearlo en el repo)

- [ ] **Step 2: Regenerar tipos vía `mcp__Supabase__generate_typescript_types`**

- [ ] **Step 3: `tsc --noEmit` limpio + suite completa del monorepo**

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/supabase/types_db.ts
git commit -m "chore(types): regenerar types_db.ts con schema de admin (admins, estado_cuenta, facturacion_negocio)"
```

---

## Self-Review Checklist

**1. Cobertura del spec** (`docs/superpowers/specs/2026-09-15-panel-admin-d1-design.md`):
- [ ] Auth de admin 100% separada, testeada (Tasks 1, 4, 5, 6, 7)
- [ ] `estado_cuenta` con enforcement real en el webhook, testeado (Tasks 2, 8)
- [ ] `facturacion_negocio` con deny-by-default (Task 3)
- [ ] 3 páginas de lectura funcionales (Task 9)
- [ ] Usuario admin real creado (Task 10)

**2. Explícitamente diferido**: las mutaciones desde la UI (activar overrides,
cambiar estado_cuenta, date-picker de alta) — la base de lectura y toda la
lógica de seguridad ya están completas y testeadas; la capa de escritura desde
el panel se construye en una iteración siguiente, mismo patrón que C1→C2.

**Próximo:** D2 (agente propio del dueño) o completar las mutaciones de D1.
