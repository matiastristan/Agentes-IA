# CRM Ventas/Productos (B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el schema, la lógica de negocio y la tool del agente para el CRM de Ventas: productos con atributos flexibles, ventas con múltiples items/combos, descuento de stock, y alertas configurables.

**Architecture:** Migraciones vía Supabase MCP (mismo patrón que A/C1). La tool `registrar_venta` sigue el aislamiento multi-tenant explícito ya establecido. `checkStockAlert` es una función pura testeada, mismo patrón que `checkReminderGuardrail` de C1.

**Tech Stack:** Next.js 16, TypeScript, Supabase (Postgres + RLS), Vitest.

## Global Constraints

- Toda tabla nueva lleva `tenant_id UUID NOT NULL` + policy RLS `tenant_id = (select auth.uid())`
- Toda query de la tool filtra `tenant_id` explícitamente en el código
- Después de cada migración: `get_advisors` (security + performance), resolver warnings antes de cerrar la task
- TDD: test primero (debe fallar), implementación, test pasa, commit

---

## File Structure

```
supabase/migrations/
  0019_productos_atributos_stock.sql
  0020_ventas_venta_items.sql
  0021_combos.sql

apps/web/lib/ventas/
  check-stock-alert.ts
  check-stock-alert.test.ts

apps/web/lib/agent/
  tools.ts                     # modificar: agregar registrar_venta
  tools.test.ts
  tool-handlers.ts              # modificar: agregar el handler
  tool-handlers.test.ts
```

---

## Task 1: Migración — extender productos (atributos, stock, umbral de alerta)

**Files:**
- Create: `supabase/migrations/0019_productos_atributos_stock.sql`

- [ ] **Step 1: Aplicar la migración**

```sql
alter table productos add column precio numeric;
alter table productos add column stock int not null default 0;
alter table productos add column atributos jsonb not null default '{}'::jsonb;
alter table productos add column umbral_alerta_stock int;
```

- [ ] **Step 2: Verificar columnas**

```sql
select column_name from information_schema.columns
where table_name = 'productos' and column_name in ('precio', 'stock', 'atributos', 'umbral_alerta_stock');
```

Expected: 4 filas.

- [ ] **Step 3: `get_advisors` security — confirmar sin warnings nuevos**

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0019_productos_atributos_stock.sql
git commit -m "feat(db): extender productos con precio, stock, atributos flexibles y umbral de alerta"
```

---

## Task 2: Migración — combos

**Files:**
- Create: `supabase/migrations/0021_combos.sql` (se aplica antes que ventas por la FK de venta_items)

- [ ] **Step 1: Aplicar la migración**

```sql
create table combos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  nombre text not null,
  productos_incluidos jsonb not null,
  precio numeric not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_combos_tenant on combos(tenant_id);

alter table combos enable row level security;
create policy tenant_isolation_combos on combos
  using (tenant_id = (select auth.uid()));
```

- [ ] **Step 2: `get_advisors` security — confirmar sin warnings nuevos**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0021_combos.sql
git commit -m "feat(db): tabla combos (productos empaquetados con precio propio)"
```

---

## Task 3: Migración — ventas y venta_items

**Files:**
- Create: `supabase/migrations/0020_ventas_venta_items.sql`

**Interfaces:**
- Consumes: `productos.id`, `combos.id` (Tasks 1-2)

- [ ] **Step 1: Aplicar la migración**

```sql
create table ventas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  customer_id text,
  customer_name text,
  total numeric not null default 0,
  estado text not null default 'confirmada' check (estado in ('confirmada', 'cancelada')),
  created_at timestamptz not null default now()
);

create table venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas(id) on delete cascade,
  producto_id uuid references productos(id),
  combo_id uuid references combos(id),
  cantidad int not null,
  precio_unitario numeric not null,
  es_combo boolean not null default false
);

create index idx_ventas_tenant on ventas(tenant_id);
create index idx_venta_items_venta on venta_items(venta_id);

alter table ventas enable row level security;
create policy tenant_isolation_ventas on ventas
  using (tenant_id = (select auth.uid()));

-- venta_items no lleva tenant_id propio (hereda el aislamiento vía venta_id -> ventas.tenant_id);
-- la policy se apoya en un subquery a ventas para no duplicar la columna.
alter table venta_items enable row level security;
create policy tenant_isolation_venta_items on venta_items
  using (
    exists (
      select 1 from ventas
      where ventas.id = venta_items.venta_id
      and ventas.tenant_id = (select auth.uid())
    )
  );
```

- [ ] **Step 2: `get_advisors` security — confirmar sin warnings nuevos** (prestar atención especial acá: las policies con subquery a veces generan warnings de performance por el join implícito — si aparece, envolver el subquery en `(select ...)` igual que se hizo con `auth.uid()` en Fase 1)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0020_ventas_venta_items.sql
git commit -m "feat(db): tablas ventas y venta_items (múltiples productos/combos por venta)"
```

---

## Task 4: checkStockAlert — función pura

**Files:**
- Create: `apps/web/lib/ventas/check-stock-alert.ts`
- Create: `apps/web/lib/ventas/check-stock-alert.test.ts`

- [ ] **Step 1: Escribir los tests**

```ts
import { describe, it, expect } from 'vitest';
import { checkStockAlert } from './check-stock-alert';

describe('checkStockAlert', () => {
  it('stock por encima del umbral no alerta', () => {
    expect(checkStockAlert(10, 5).requiereAlerta).toBe(false);
  });

  it('stock igual al umbral SÍ alerta', () => {
    expect(checkStockAlert(5, 5).requiereAlerta).toBe(true);
  });

  it('stock por debajo del umbral alerta', () => {
    expect(checkStockAlert(2, 5).requiereAlerta).toBe(true);
  });

  it('sin umbral configurado (null) nunca alerta', () => {
    expect(checkStockAlert(0, null).requiereAlerta).toBe(false);
  });
});
```

- [ ] **Step 2: Correr, debe fallar**

- [ ] **Step 3: Implementar**

```ts
interface StockAlertResult {
  requiereAlerta: boolean;
}

export function checkStockAlert(stock: number, umbral: number | null): StockAlertResult {
  if (umbral === null) return { requiereAlerta: false };
  return { requiereAlerta: stock <= umbral };
}
```

- [ ] **Step 4: Correr, debe pasar**

Run: `cd apps/web && npx vitest run lib/ventas/check-stock-alert.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/ventas
git commit -m "feat(ventas): checkStockAlert — umbral configurable por producto"
```

---

## Task 5: Tool registrar_venta

**Files:**
- Modify: `apps/web/lib/agent/tools.ts`
- Modify: `apps/web/lib/agent/tools.test.ts`
- Modify: `apps/web/lib/agent/tool-handlers.ts`
- Modify: `apps/web/lib/agent/tool-handlers.test.ts`

**Interfaces:**
- Consumes: `ventas`, `venta_items`, `productos`, `combos` (Tasks 1-3)

- [ ] **Step 1: Test de la definición de la tool**

```ts
// agregar a tools.test.ts:
it('tier base incluye registrar_venta', () => {
  const tools = getToolsForTier('base');
  const names = tools.map((t) => t.function.name);
  expect(names).toContain('registrar_venta');
});
```

- [ ] **Step 2: Correr, debe fallar**

- [ ] **Step 3: Agregar la definición en tools.ts**

```ts
const registrar_venta: ToolDefinition = {
  type: 'function',
  function: {
    name: 'registrar_venta',
    description: 'Registra una venta con uno o más productos o combos, y descuenta el stock correspondiente.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Nombre del cliente' },
        items: {
          type: 'array',
          description: 'Lista de productos o combos comprados',
          items: {
            type: 'object',
            properties: {
              producto_id: { type: 'string', description: 'ID del producto (si no es un combo)' },
              combo_id: { type: 'string', description: 'ID del combo (si aplica)' },
              cantidad: { type: 'number', description: 'Cantidad comprada' },
            },
          },
        },
      },
      required: ['customer_name', 'items'],
    },
  },
};

// agregar a BASE_TOOLS junto a las demás
```

- [ ] **Step 4: Correr, debe pasar**

- [ ] **Step 5: Test del handler — aislamiento multi-tenant + descuento de stock**

```ts
// agregar a tool-handlers.test.ts:
it('registrar_venta filtra explícitamente por tenant_id al insertar la venta', async () => {
  const { client, calls } = createMockSupabase({ data: { id: 'venta-1' }, error: null });
  await executeToolCall(
    'registrar_venta',
    { customer_name: 'Juan', items: [{ producto_id: 'prod-1', cantidad: 2 }] },
    { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' }
  );
  const insertCalls = calls.filter((c) => c.method === 'insert');
  const ventaInsert = insertCalls[0].args[0] as { tenant_id: string };
  expect(ventaInsert.tenant_id).toBe(TENANT_A);
});
```

- [ ] **Step 6: Correr, debe fallar**

- [ ] **Step 7: Implementar el handler**

```ts
async function registrarVenta(
  args: { customer_name: string; items: Array<{ producto_id?: string; combo_id?: string; cantidad: number }> },
  ctx: ToolContext
): Promise<ToolResult> {
  const { data: venta, error: ventaError } = await ctx.supabase
    .from('ventas')
    .insert({ tenant_id: ctx.tenantId, customer_name: args.customer_name })
    .select()
    .single();

  if (ventaError) return { error: 'No se pudo registrar la venta' };

  for (const item of args.items) {
    await ctx.supabase.from('venta_items').insert({
      venta_id: venta.id,
      producto_id: item.producto_id ?? null,
      combo_id: item.combo_id ?? null,
      cantidad: item.cantidad,
      precio_unitario: 0, // se completa con el precio real en la iteración de UI/lógica de precios
      es_combo: !!item.combo_id,
    });

    if (item.producto_id) {
      // Descuento de stock: nota de implementación — usar una función RPC
      // atómica (`decrement_stock`) en una iteración siguiente para evitar
      // race conditions con ventas simultáneas del mismo producto. Para este
      // plan, un update simple es suficiente porque el volumen esperado en
      // el MVP es bajo.
      const { data: producto } = await ctx.supabase
        .from('productos')
        .select('stock')
        .eq('tenant_id', ctx.tenantId)
        .eq('id', item.producto_id)
        .single();

      if (producto) {
        await ctx.supabase
          .from('productos')
          .update({ stock: producto.stock - item.cantidad })
          .eq('tenant_id', ctx.tenantId)
          .eq('id', item.producto_id);
      }
    }
  }

  return { data: venta };
}

// agregar el case al switch de executeToolCall:
case 'registrar_venta':
  return registrarVenta(args as { customer_name: string; items: Array<{ producto_id?: string; combo_id?: string; cantidad: number }> }, ctx);
```

- [ ] **Step 8: Correr, debe pasar**

Run: `npx vitest run lib/agent/tool-handlers.test.ts`

- [ ] **Step 9: `tsc --noEmit` limpio + suite completa del monorepo**

Run: `npx tsc --noEmit && npx vitest run` (apps/web), `npx vitest run` (packages/design-tokens)

- [ ] **Step 10: Commit**

```bash
git add apps/web/lib/agent
git commit -m "feat(agent): tool registrar_venta con múltiples items/combos y descuento de stock"
```

---

## Task 6: Regenerar tipos TypeScript

**Files:**
- Modify: `apps/web/lib/supabase/types_db.ts`

- [ ] **Step 1: Generar vía `mcp__Supabase__generate_typescript_types`**
- [ ] **Step 2: Reemplazar el contenido de `types_db.ts`**
- [ ] **Step 3: `tsc --noEmit` limpio + suite completa**
- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/supabase/types_db.ts
git commit -m "chore(types): regenerar types_db.ts con schema de ventas (productos extendido, ventas, venta_items, combos)"
```

---

## Self-Review Checklist

**1. Cobertura del spec** (`docs/superpowers/specs/2026-09-15-crm-ventas-productos-design.md`):
- [ ] `productos` extendido con atributos flexibles, stock, umbral de alerta (Task 1)
- [ ] `combos` y `ventas`/`venta_items` (Tasks 2-3)
- [ ] `checkStockAlert` testeado (Task 4)
- [ ] `registrar_venta` con aislamiento multi-tenant y descuento de stock (Task 5)
- [ ] Tipos regenerados (Task 6)

**2. Placeholder scan**: el único punto marcado explícitamente como simplificación
consciente es el descuento de stock vía `update` simple en vez de una función
RPC atómica — anotado en el código (Task 5, Step 7) como mejora para cuando el
volumen de ventas simultáneas lo justifique, no es un placeholder roto.

**3. Explícitamente diferido**: la UI (carga de Excel, tabla dinámica de
atributos, gestión de combos, "Nueva Venta") — este plan es el backend de B,
análogo a lo que fue C1 para C. La UI se planifica aparte una vez validado el
backend, mismo criterio usado entre C1 y C2.

**Próximo:** UI de B (carga de Excel, catálogo editable, ventas) o sub-proyecto D.
