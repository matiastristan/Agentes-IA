# Panel Admin (Sub-proyecto D1)

**Fecha**: 2026-09-15
**Estado**: Aprobado por el usuario, listo para `writing-plans`
**Orden de construcción acordado**: A (✅) → C1 (✅) → C2 (✅) → B (✅) → D1 → D2 → UI de B
**Depende de**: Sub-proyecto A (schema de `negocio`, `negocio_feature_overrides`), `lib/supabase/service-client.ts` (Fase 3)

## Contexto

Panel para que Matías (dueño de la plataforma) administre todos los negocios:
altas/bajas, activación de features puntuales (overrides ya diseñados en A/C1/C2),
y su propia facturación a cada cliente. Se separó en D1 (este spec) y D2 (agente
propio del dueño), porque son subsistemas independientes.

**Principio ético acordado explícitamente con el usuario**: el panel NUNCA
muestra las ventas/datos de negocio de los tenants (eso es privado de cada
negocio). Solo muestra lo que compete a la plataforma: cuántos clientes hay,
cómo crecen, y cuánto les factura Matías a ellos por el servicio.

## Alcance

### 1. Autenticación separada de los tenants

```sql
create table admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
```

Esta tabla nunca se alimenta desde un flujo público — el único admin (Matías)
se inserta manualmente vía SQL/Supabase MCP. `proxy.ts` agrega una rama
completamente separada para `/admin/*`: no usa `supabase.auth.getUser()` (eso
es el sistema de los tenants), usa una cookie de sesión propia validada contra
esta tabla. Un dueño de negocio nunca puede terminar en `/admin` por accidente
ni por bug de sesión, porque son dos mecanismos de autenticación que no se
tocan en ningún punto del código.

Las queries del panel usan `createServiceClient()` (ya construido en Fase 3
para el webhook) — bypasea RLS intencionalmente, porque el panel necesita ver
todos los tenants a la vez.

### 2. Estados granulares de negocio

```sql
alter table negocio add column estado_cuenta text not null default 'activo'
  check (estado_cuenta in ('activo', 'suspendido_pago', 'baja_definitiva'));
```

- `activo`: comportamiento normal, el agente responde.
- `suspendido_pago`: el webhook de WhatsApp (route handler de Fase 3) chequea
  este campo antes de procesar un mensaje — si no es `'activo'`, no llama al
  agente ni gasta tokens de OpenRouter. Los datos del negocio (conversaciones,
  productos, citas) quedan intactos por si vuelve a pagar.
- `baja_definitiva`: mismo comportamiento que suspendido a nivel webhook, pero
  semánticamente marca el cierre de la cuenta (no es solo una demora de pago).

### 3. Tabla `facturacion_negocio`

```sql
create table facturacion_negocio (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  concepto text not null,
  monto numeric not null,
  fecha date not null,
  created_at timestamptz not null default now()
);
```

`concepto` es texto libre en la práctica pero se usan valores consistentes en
la UI: `'plan_base'`, `'multi_recurso'`, `'plantillas_meta'`,
`'carga_manual_turnos'`, `'mobile_vista_scroll_horizontal'`, etc. — cada vez
que Matías activa un override o cobra el plan, registra la fila acá. Esta
tabla es la única fuente de "cuánto factura Matías" — nunca se cruza con
`ventas` (que es de los tenants).

Esta tabla no necesita RLS de aislamiento por tenant porque **solo el admin
la lee** (vía `service_client`, que bypasea RLS de cualquier forma). Se agrega
RLS de todos modos por consistencia y como defensa en profundidad, con policy
que deniega todo acceso vía anon/authenticated (nadie más que el service_role
debe tocarla):

```sql
alter table facturacion_negocio enable row level security;
-- sin policies para anon/authenticated = deny by default; solo service_role accede
```

### 4. Feed de vencimientos (dentro del panel, sin canales externos)

Página `/admin` lista negocios donde `plan_fecha_vencimiento <= hoy + 7 días`,
ordenados por proximidad. Decisión explícita del usuario: nada sale del panel
(no email, no WhatsApp) — se revisa entrando a la app.

### 5. Páginas

```
/admin/login                 Login separado (contra tabla `admins`)
/admin                       Feed de vencimientos + resumen (negocios activos por rubro/tipo_crm, altas del mes)
/admin/negocios               Listado de todos los negocios + cambio de estado_cuenta
/admin/negocios/[id]           Detalle: tier, overrides activos (activar/desactivar
                               multi_recurso, plantillas_meta_habilitadas,
                               carga_manual_turnos, mobile_vista_scroll_horizontal),
                               historial de facturacion_negocio, date-picker para
                               plan_fecha_alta
```

### 6. Enforcement del estado_cuenta en el webhook

El route handler de WhatsApp (`app/api/webhooks/whatsapp/route.ts`, Fase 3) se
modifica: después de encontrar el `negocio` por `phone_number_id`, si
`estado_cuenta !== 'activo'`, se responde 200 sin llamar a `handleIncomingMessage`
(ni a OpenRouter ni a ninguna tool) — mismo patrón que ya existe para mensajes
que no son de texto.

## Explícitamente fuera de alcance de D1 (pasa a D2 o backlog)

- El agente propio de Matías (WhatsApp + chat en el panel) → **D2**, brainstorming aparte
- Gestión de clientes de los tenants + campañas masivas → backlog (spec de A)
- Cualquier vista de ventas/facturación de los tenants hacia sus propios
  clientes → explícitamente excluido por decisión ética, no solo por scope

## Testing

- Aislamiento de auth: test de que las queries de `/admin` usan `service_client`
  y no dependen de `auth.uid()` de Supabase (verificar que el patrón de
  autenticación de admin es independiente del de tenants).
- `estado_cuenta` bloquea el webhook: test de `handleIncomingMessage`-adjacent
  (o del route handler) confirmando que un negocio con `estado_cuenta = 'suspendido_pago'`
  nunca llega a invocar `callOpenRouter`.
- Migraciones aplicadas vía Supabase MCP + `get_advisors` sin warnings nuevos
  (prestar atención a que `facturacion_negocio` con RLS sin policies no genere
  un falso positivo de "RLS enabled sin policies" — si el advisor lo marca,
  evaluar si conviene agregar una policy explícita `using (false)` en vez de
  dejarla implícita).
