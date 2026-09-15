# CRM Ventas/Productos (Sub-proyecto B)

**Fecha**: 2026-09-15
**Estado**: Aprobado por el usuario, listo para `writing-plans`
**Orden de construcción acordado**: A (✅) → C1 (✅) → C2 (✅) → B → D
**Depende de**: Sub-proyecto A (rubro/tiers/feature-gating)

## Contexto

CRM para negocios con `tipo_crm = 'ventas'`: mayoristas, pet shops, suplementos
de gimnasio, alimentos congelados/panificados/pastas, viajes y turismo,
electrónica, computación. A diferencia de C (turnos), acá el eje es el
catálogo de productos y las ventas, no el calendario.

## Alcance

### 1. Extensión de `productos` (JSON flexible en vez de columnas dinámicas)

**Decisión de arquitectura clave**: se evaluó generar columnas de base de datos
reales a partir de los encabezados del Excel que sube cada cliente. Se descarta
por riesgo de seguridad (inyección vía nombres de columna arbitrarios), falta
de escalabilidad (miles de negocios con esquemas distintos), y porque rompe el
patrón de aislamiento multi-tenant ya establecido. En su lugar, cualquier campo
que no sea `nombre`/`precio`/`stock` se guarda en un JSON flexible
(`atributos`) — el cliente ve el mismo resultado (su propia tabla con sus
propias columnas), pero la implementación es segura y escalable.

```sql
alter table productos add column precio numeric;
alter table productos add column stock int not null default 0;
alter table productos add column atributos jsonb not null default '{}'::jsonb;
alter table productos add column umbral_alerta_stock int;
```

(Nota: `productos` ya existe desde Fase 1 con `variantes jsonb` — se evalúa en
la fase de implementación si conviene migrar `variantes` a `atributos` o
mantener ambos según cómo haya quedado usado en producción hasta ahora.)

### 2. Carga vía Excel

- Upload libre, sin campos obligatorios.
- Al subir, se muestra una guía (no bloqueante): "recomendamos incluir nombre,
  precio y stock para que el agente aproveche mejor tu catálogo".
- Las columnas reconocidas (`nombre`, `precio`, `stock`) se mapean a columnas
  reales; cualquier otra columna del Excel se guarda como clave dentro de
  `atributos`.
- Edición desde el CRM: tabla tipo spreadsheet que renderiza dinámicamente las
  columnas según las claves presentes en `atributos` para ese `tenant_id`
  específico — cada negocio ve solo sus propias columnas.

### 3. Tablas `ventas` y `venta_items`

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
```

Una venta puede incluir múltiples productos y/o combos (`venta_items` es 1-a-N
respecto de `ventas`). Al confirmarse una venta, se descuenta stock de cada
`producto_id` involucrado — directamente para productos sueltos, y recorriendo
los productos que integran un combo cuando `es_combo = true`.

### 4. Tabla `combos`

```sql
create table combos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  nombre text not null,
  productos_incluidos jsonb not null, -- [{ producto_id, cantidad }]
  precio numeric not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
```

El dueño arma combos personalizados desde el CRM ("Nueva Venta" / gestión de
catálogo) combinando productos existentes con cantidades y un precio propio
para el combo.

### 5. Alertas de stock configurables por producto

`productos.umbral_alerta_stock` — cuando `stock <= umbral_alerta_stock`, la UI
muestra un badge de alerta (mismo lenguaje visual que los guardrails ya
construidos en C1/C2: warning, no bloqueante). El umbral es libre por
producto, para que el dueño lo ajuste según rotación y demanda de cada ítem.

### 6. Tool nueva del agente: `registrar_venta`

```
registrar_venta(tenant_id, customer_id, items: [{ producto_id | combo_id, cantidad }])
```

Aislamiento multi-tenant explícito idéntico al resto de las tools (Fase 3, C1):
inserta en `ventas` y `venta_items` filtrando siempre por `tenant_id` del
contexto verificado, nunca de los argumentos del modelo. Descuenta stock al
confirmar. `obtener_catalogo` (ya existe desde Fase 3) se reusa sin cambios —
ahora naturalmente incluye `atributos` en la respuesta.

## Explícitamente fuera de alcance de B

- Facturación fiscal real, tracking de pagos más allá de MercadoPago, logística
  de envíos (fechas de entrega, demoras, devoluciones) → backlog, fase
  posterior a B (ver spec de sub-proyecto A, sección de backlog)
- El panel de super-admin → sub-proyecto D
- Migración de datos existentes de `variantes` a `atributos` si hiciera falta
  → se evalúa en la fase de implementación, no es una decisión de diseño

## Testing

- Aislamiento multi-tenant en `registrar_venta` (mismo patrón que
  `tool-handlers.test.ts`): verificar que la venta y sus items se crean con el
  `tenant_id` del contexto, nunca de los args.
- Descuento de stock: test que confirma que tras `registrar_venta` con
  cantidad N, el producto queda con `stock - N`.
- Alerta de stock: función pura `checkStockAlert(stock, umbral)` testeada de
  forma aislada (mismo patrón que `checkReminderGuardrail` de C1).
- Combos: test de que un `venta_item` con `es_combo = true` descuenta stock de
  TODOS los productos que integran ese combo, no solo de uno.
- Migraciones aplicadas vía Supabase MCP + `get_advisors` sin warnings nuevos.
