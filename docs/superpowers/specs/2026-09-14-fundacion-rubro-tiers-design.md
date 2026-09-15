# Fundación: Rubro + Sistema de Tiers (Sub-proyecto A)

**Fecha**: 2026-09-14
**Estado**: Aprobado por el usuario, listo para `writing-plans`
**Orden de construcción acordado**: A → C (CRM Turnos) → B (CRM Ventas) → D (Panel Admin)

## Contexto

El proyecto pasó de "un SaaS de agente IA" a una plataforma con **2 verticales de CRM
independientes** (Ventas/Productos y Turnos/Citas), un **panel de super-admin**
transversal, y un **sistema de 3 tiers** (Base/Pro/Premium) que gatea features en
todo lo anterior. Este spec cubre solo la fundación de datos y lógica que **B**, **C**
y **D** van a necesitar — no construye ninguna página de CRM todavía.

## Alcance

### 1. Clasificación del negocio

Dos campos nuevos en `negocio`:

```sql
alter table negocio add column tipo_crm text not null default 'turnos'
  check (tipo_crm in ('ventas', 'turnos'));
alter table negocio add column rubro text; -- ej: 'barberia', 'pet_shop', 'cancha_padel'
```

`tipo_crm` decide qué conjunto de páginas/componentes ve el negocio en el frontend
(construido en las fases C y B). `rubro` es más específico — se usa para
personalizar textos del agente y para agrupar métricas en el panel admin (D).

Rubros de referencia (no son un enum estricto en DB, son sugerencias en el signup):

- **Ventas**: mayorista, pet_shop, suplementos_gimnasio, alimentos_congelados,
  panificados, pastas, viajes_turismo, electronica, computacion, logistica,
  paqueteria, catering, marketing_digital, autos_usados
- **Turnos**: cancha_padel, cancha_futbol, cancha_tenis, gimnasio, barberia,
  unas_pestanas, estetica, salud_belleza, odontologia

### 2. Tiers (actualizado — swap confirmado por el usuario)

```sql
alter table negocio drop constraint negocio_tier_check;
alter table negocio add constraint negocio_tier_check
  check (tier in ('base', 'pro', 'premium'));
```

| Tier | Features |
|---|---|
| **Base** | `agente_responde`, `agendar_citas`, `notificaciones`, `derivar_vendedor`, `memoria_conversacional` |
| **Pro** | Base + `combos_promociones`, `descuentos_configurables`, `saludo_cumpleanos`, `turnos_fijos_mensualizados`, `cuenta_corriente` |
| **Premium** | Pro + `cobro_mercadopago`, `transferencias`, `comprobantes`, `billeteras_virtuales` |

Nota del swap: el cobro de pagos quedó como el escalón más alto (Premium), y las
funciones de fidelización/marketing (combos, cumpleaños, cuenta corriente) son Pro.

### 3. Feature-gating: híbrido código + excepciones por negocio

**Capa 1 — reglas por defecto en código** (`apps/web/lib/plans/features.ts`):
mapa estático `TIER_FEATURES: Record<Tier, FeatureKey[]>` con la tabla de arriba.
Versionado en git, predecible, sin UI de administración que construir todavía.

**Capa 2 — excepciones puntuales por negocio** (tabla nueva):

```sql
create table negocio_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  feature_key text not null,
  habilitado boolean not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, feature_key)
);
-- RLS: tenant_id = (select auth.uid()) igual que las demás tablas
```

**Función pura testeada** `hasFeature(tier, overrides, featureKey)`:
1. Si hay un override explícito para ese negocio y esa feature → gana el override (true o false)
2. Si no hay override → se aplica la regla de `TIER_FEATURES` según el tier

Esta función es la que va a usar toda la UI (botones, secciones del CRM) para
decidir qué mostrar — nunca se chequea el tier directamente en los componentes.

### 4. Facturación del plan

```sql
alter table negocio add column plan_ciclo_facturacion text not null default 'mensual'
  check (plan_ciclo_facturacion in ('mensual', 'anual'));
alter table negocio add column plan_fecha_alta date;
alter table negocio add column plan_fecha_vencimiento date;
alter table negocio add column plan_estado_pago text not null default 'al_dia'
  check (plan_estado_pago in ('al_dia', 'vencido', 'pendiente'));
```

- Ciclo **mensual**: vence 30 días después de `plan_fecha_alta` (o del último pago registrado).
- Ciclo **anual**: vence 365 días después, con descuento a definir en el panel admin (D) al momento de dar de alta — el valor del descuento y el pricing en sí NO se modelan en este sub-proyecto, solo el campo `plan_ciclo_facturacion` que lo habilita.
- `plan_fecha_alta` se completa desde un date-picker en el panel admin (construido en **D**, no acá) — este spec solo deja el campo listo en la base.
- La lógica de detectar vencimientos y disparar notificaciones se construye en **D**. Acá solo se agregan las columnas.

### 5. Memoria del cliente (cross-conversación, todos los tiers por igual)

Tabla nueva:

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
-- RLS: tenant_id = (select auth.uid())
```

Cambio en el agente (`lib/agent/handle-incoming-message.ts` y el `loadRecentMessages`
que se le inyecta desde el route handler): en vez de buscar los últimos 10 mensajes
de la conversación **activa**, buscar los últimos 10 mensajes de **todas** las
conversaciones de ese `(tenant_id, phone_from)`. Así si un cliente escribe en
agosto y vuelve en noviembre en una conversación nueva, el agente tiene contexto.

**Explícitamente fuera de este alcance (YAGNI, se evalúa en la beta)**: resumen
generado por IA de historial muy viejo para ahorrar tokens. Con los últimos 10
mensajes cross-conversación alcanza para el MVP.

### 6. Signup actualizado

El formulario de `/signup` (Fase 2) suma dos campos: `tipo_crm` (selector Ventas/Turnos)
y `rubro` (selector dependiente del tipo_crm elegido, con las opciones de la sección 1).
El trigger `handle_new_user()` en Supabase se actualiza para leer estos dos campos
de `raw_user_meta_data` además de `nombre_negocio`.

### 7. Decisión: modelo LLM compartido (no uno por negocio)

Se evaluó contratar un LLM dedicado por negocio vs. un modelo compartido vía
OpenRouter (lo ya construido en Fase 3). Se decide mantener **compartido**:
la personalización real viene del contexto inyectado (system prompt dinámico +
catálogo + historial vía `clientes`), no de qué modelo corre por debajo. Un
modelo por negocio multiplicaría costo operativo sin ganancia de aislamiento
ni de personalización, y sería inviable de escalar para un solopreneur. La
diferenciación de costo/calidad ya existe y es más inteligente: por **tier**
(Haiku en Base, Sonnet en Pro/Premium), no por identidad del negocio.

Queda en el backlog **BYOK** (ver más abajo) como camino de escala para
negocios grandes que quieran pagar su propio consumo de LLM directamente.

## Explícitamente fuera de alcance de A

- Las páginas de CRM en sí (Conversaciones, Catálogo, Turnos) → **C** y **B**
- El panel de super-admin, el date-picker de alta, la lógica de notificación de
  cobros vencidos → **D**
- Pricing real de MercadoPago, cálculo del descuento anual → **D** (cuando se
  diseñe el panel de facturación)
- Resumen de historial con IA → backlog post-beta

## Backlog de ideas para futuras fases (no se construyen ahora)

Recordatorios inteligentes de recompra, lista de espera automática en turnos
cancelados, encuestas de satisfacción automáticas, detección de idioma y
respuesta multi-idioma, programa de referidos, reportes semanales automáticos
al dueño del negocio. Se evalúan durante la fase beta según lo que pidan los
primeros negocios reales.

**BYOK (Bring Your Own Key)**: para negocios grandes/enterprise, permitir que
traigan su propia API key de OpenRouter/Anthropic y paguen su propio consumo
de LLM directamente, en vez de que el costo salga del margen del plan que le
cobrás vos. Requeriría un campo `negocio.openrouter_api_key_propia` (encriptado,
igual que `access_token` de Meta) y que `callOpenRouter()` use esa key si existe,
si no la key compartida de la plataforma. Feature de escala, no para el MVP.

**Gestión de clientes y campañas masivas** (para sub-proyecto D): más allá de
gestionar conversaciones puntuales, el CRM del negocio necesita una vista de
"Clientes" que crezca con la tabla `clientes` (ya creada en este sub-proyecto A)
— historial, segmentación, y la capacidad de lanzar campañas masivas de
WhatsApp (ej. promociones a todos los clientes de un rubro/franja). Requiere:
opt-in/consentimiento explícito por cliente (no se puede mandar masivo sin eso,
por las mismas políticas de Meta ya documentadas), y casi seguro plantillas de
Meta aprobadas para el envío masivo (mismo mecanismo que `plantillas_meta_habilitadas`
de C1). Se diseña en detalle cuando se llegue a D.

**Sistema completo de cobro y logística** (para sub-proyecto B en una fase
posterior a la actual): facturación real (comprobantes fiscales), tracking de
pagos más allá del cobro puntual vía MercadoPago (estados de cuenta, saldos),
y logística completa de envíos — fechas de entrega estimadas, demoras,
devoluciones. El objetivo final es que el agente pueda responderle a un
cliente por WhatsApp preguntas como "¿cuándo llega mi pedido?" o "quiero
devolver esto" con datos reales, no solo confirmar la venta. Requiere definir
una tabla de envíos/logística y probablemente integración con un proveedor de
correo/logística — se diseña con su propio brainstorming cuando se priorice.

## Testing

- `hasFeature()` — tests unitarios cubriendo: feature en tier base, feature
  exclusiva de pro/premium, override que habilita algo fuera del tier, override
  que deshabilita algo que el tier sí incluye.
- `loadRecentMessages` cross-conversación — test verificando que trae mensajes
  de dos conversaciones distintas del mismo `phone_from`, y que NO trae mensajes
  de otro `phone_from` ni de otro `tenant_id`.
- Migraciones de schema aplicadas y verificadas vía Supabase Advisors (mismo
  proceso que Fases 1-3: sin warnings de seguridad ni performance nuevos).
