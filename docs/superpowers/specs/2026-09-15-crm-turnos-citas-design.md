# CRM Turnos/Citas (Sub-proyecto C)

**Fecha**: 2026-09-15
**Estado**: Aprobado por el usuario, listo para `writing-plans`
**Orden de construcción acordado**: A (✅) → C → B → D
**Depende de**: Sub-proyecto A (rubro/tiers/feature-gating/memoria del cliente)

## Contexto

Este es el CRM para negocios con `tipo_crm = 'turnos'`: canchas de pádel/fútbol/tenis,
gimnasios, barberías, uñas y pestañas, estética, salud y belleza, odontología. El
corazón es un calendario propio (no sincronizado con Google Calendar — decisión
tomada en el brainstorming: la plataforma tiene que ser autocontenida, sin pedirle
al dueño que configure cuentas externas) con soporte para múltiples recursos en
simultáneo (canchas, sillones, profesionales).

## Alcance

### 1. Tabla `servicios`

Reemplaza usar `productos` para este rubro — un servicio no tiene talle/stock,
tiene duración.

```sql
create table servicios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  nombre text not null,
  duracion_minutos int not null,
  precio numeric not null,
  promociones jsonb not null default '[]'::jsonb,
  horario_override jsonb, -- null = usa negocio.horarios; si está seteado, override específico de este servicio
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

El dueño puede crear sus propios servicios con parámetros libres ("Nuevo Servicio")
— nombre, duración, precio, promociones, y opcionalmente una ventana horaria propia
distinta del horario general del negocio.

### 2. Tabla `recursos`

Permite turnos en simultáneo — varias canchas, varios sillones, varios profesionales.

```sql
create table recursos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  nombre text not null,             -- "Cancha 1", "Juan (barbero)"
  subtipo text,                     -- 'futbol_5' | 'futbol_7' | 'futbol_9' | 'futbol_11', null si no aplica
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
```

El cliente puede pedir un recurso específico (su barbero de confianza) o dejar que
el agente asigne el primero disponible.

### 3. Extensión de `citas` (tabla ya existente desde Fase 1)

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

### 4. Tabla `lista_espera`

```sql
create table lista_espera (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  phone text not null,
  servicio_id uuid references servicios(id),
  recurso_id uuid references recursos(id), -- null = cualquier recurso sirve
  franja_horaria_deseada jsonb not null, -- { fecha, hora_desde, hora_hasta }
  estado text not null default 'esperando' check (estado in ('esperando', 'notificado', 'confirmado', 'vencido')),
  created_at timestamptz not null default now()
);
```

Cuando se cancela una cita, un trigger de backend (no una tool del agente — lógica
interna) recorre `lista_espera` filtrando por `servicio_id`/`recurso_id`/franja
compatible y le escribe automáticamente al primero en orden de llegada. Esto es
lo que reemplaza la idea original de "colgar un estado" — inviable técnicamente
(ver sección 7) pero logra el mismo objetivo de negocio sin violar las políticas
de mensajería de Meta, porque el cliente hizo opt-in explícito al anotarse.

### 5. Tabla `recordatorios_config`

Sistema de alertas configurable por negocio — no hardcodeado.

```sql
create table recordatorios_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  minutos_antes int not null,
  mensaje_template text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
```

El dueño puede crear tantas reglas como quiera (24hs antes, 2hs antes, lo que
necesite su negocio).

**Guardrail de la ventana de 24hs (UX acordada):**
- `negocio.plantillas_meta_habilitadas boolean default false` — se activa desde
  el panel admin (sub-proyecto D) cuando la plataforma configura y aprueba una
  plantilla de Meta para ese negocio específico (servicio adicional que se cobra
  aparte, ya que requiere gestión manual con Meta Business Manager).
- Si el dueño crea una regla con `minutos_antes > 1440` (más de 24hs) mientras
  `plantillas_meta_habilitadas = false`, la UI muestra un ícono de alerta (⚠️)
  junto a esa regla. Al hacer click se abre un modal explicando la limitación +
  botón "Contactar soporte para habilitar" (dispara un ticket/contacto — el canal
  exacto se define en el sub-proyecto D).
- Por default, sin tocar nada, las reglas quedan dentro de las 24hs — cero
  fricción, cero riesgo de que una regla falle silenciosamente en producción.

### 6. Tabla `reglas_reprogramacion`

```sql
create table reglas_reprogramacion (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  horas_minimas_anticipacion int not null default 24,
  permite_sin_perder_sena boolean not null default true,
  created_at timestamptz not null default now()
);
```

Reprogramación **self-service total**: el cliente le pide al agente reprogramar,
y el agente verifica disponibilidad, mueve el turno, y libera el horario viejo —
todo automático, siempre que se cumplan las `reglas_reprogramacion` del negocio
(si no se cumplen, el agente informa que no se puede sin perder la seña/pago y
deriva al dueño si el cliente insiste).

### 7. Restricción técnica documentada (no se resuelve en código)

WhatsApp Cloud API no tiene ningún endpoint para publicar "Estados" (la función
tipo historia de la app de WhatsApp Business es 100% manual, no automatizable).
Además, cualquier mensaje proactivo a alguien que no escribió en las últimas 24hs
requiere una plantilla pre-aprobada por Meta. Por eso el diseño reemplaza "colgar
un estado visible para todos los contactos" por la lista de espera con opt-in
(sección 4), que sí es 100% viable con la API real.

### 8. Tools nuevas para el agente (se suman a las 5 de Fase 3)

- `reprogramar_cita(tenant_id, cita_id, nueva_fecha, nueva_hora)`: valida contra
  `reglas_reprogramacion`, ejecuta el cambio con aislamiento multi-tenant explícito
  igual que las tools existentes (ver `tool-handlers.ts` de Fase 3)
- `anotar_lista_espera(tenant_id, phone, servicio_id, franja_deseada)`: cuando no
  hay hueco disponible al momento de la consulta

### 9. Asignación de tier

| Feature | Tier | Feature key nueva |
|---|---|---|
| Agendar, calendario básico, 1 recordatorio fijo (≤24hs) | Base | (usa `agendar_citas` ya existente) |
| Recordatorios configurables (múltiples reglas) | Pro | `recordatorios_configurables` |
| Lista de espera automática | Pro | `lista_espera_automatica` |
| Reprogramación self-service | Pro | `reprogramacion_self_service` |
| Gestión de seña (marcado manual, sin cobro real) | Pro | `gestion_senas` |
| Cobro automático de seña vía MercadoPago | Premium | usa `cobro_mercadopago` ya existente |

Estas 4 features nuevas se agregan a `TIER_FEATURES.pro` en `lib/plans/features.ts`
(Sub-proyecto A) sin tocar la función `hasFeature()` en sí — ya está diseñada
para esto.

### 10. No-show

Flujo mixto acordado: a los N minutos de la hora del turno sin confirmación de
asistencia, el CRM le muestra al dueño una notificación/badge sugiriendo marcar
"No show" — el dueño confirma con un click desde la tarjeta del turno. Al
confirmarse: el turno pasa a `estado = 'no_show'`, se libera el `recurso_id` para
la lista de espera, y queda como dato para las métricas del dashboard (tasa de
no-show, útil también para el panel admin en D).

### 11. UI — Tarjetas del calendario

Confirmado en el pedido original: tarjetas visuales con estado (disponible,
ocupado, no-show, reprogramado), responsive (desktop/mobile/tablet). El diseño
visual detallado (colores por estado, layout del calendario) se define en la
fase de implementación siguiendo `docs/design-system/design-tokens.md` — los
colores de estado ya definidos ahí (`--color-success`, `--color-warning`,
`--color-error`) se reusan para "disponible/pendiente/no-show" en vez de crear
una paleta nueva.

## Explícitamente fuera de alcance de C

- El CRM de Ventas (servicios/productos mayoristas, etc.) → sub-proyecto B
- El panel de super-admin, la activación de `plantillas_meta_habilitadas`, el
  canal de "contactar soporte" → sub-proyecto D
- La creación y aprobación real de plantillas en Meta Business Manager → proceso
  manual externo, no es código
- Sincronización con Google Calendar → backlog, no para el MVP

## Testing

- `hasFeature()` ya cubre las 4 features nuevas de Pro — solo se agregan al
  array `PRO_FEATURES`, sin lógica nueva que testear ahí.
- Tests de aislamiento multi-tenant en `reprogramar_cita` y `anotar_lista_espera`
  (mismo patrón que `tool-handlers.test.ts` de Fase 3: verificar que cada query
  filtra explícitamente por `tenant_id`).
- Test de la lógica de guardrail de 24hs: una regla con `minutos_antes > 1440`
  y `plantillas_meta_habilitadas = false` debe marcar la fila como "requiere
  atención" en el resultado de la función que valida las reglas.
- Test del trigger de lista de espera: al cancelar una cita, verificar que solo
  se notifica al primero en `estado = 'esperando'` compatible (mismo tenant,
  mismo servicio/recurso o recurso null), nunca a alguien de otro tenant.
- Migraciones aplicadas vía Supabase MCP + `get_advisors` sin warnings nuevos,
  mismo estándar que A y las fases anteriores.
