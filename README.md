# SaaS Agente IA Multi-Tenant

SaaS multi-tenant con Agente IA que responde WhatsApp 24/7, registra citas y gestiona catálogo para pequeños negocios (barberías, clínicas, calzado, pet shop, etc.).

## Estado actual (FASE 1 y FASE 2 completas)

### FASE 1 — Architecture & Design System ✅
- Monorepo pnpm + Next.js 16 + Tailwind 4
- Design tokens de 3 capas (primitive → semantic → component), 3 paletas dinámicas
- Componentes base: `Button`, `BadgeTemperatura`, `Card`, `Input`, `KPICard`, `Toggle` (todos con tests, TDD)
- Schema multi-tenant aplicado en Supabase (proyecto **AgentesIA**, `afleydeeytyfgpytlimm`):
  - Tablas: `negocio`, `productos`, `conversations`, `messages`, `citas`
  - RLS habilitado + policy `tenant_id = (select auth.uid())` en las 5 (optimizada, sin warnings del linter de Supabase)

### FASE 2 — Auth & Supabase ✅
- Trigger `handle_new_user()`: al registrarse, se crea automáticamente la fila `negocio` con `tenant_id = auth.users.id` (probado en Supabase real)
- `lib/supabase/client.ts` / `lib/supabase/server.ts` — clientes tipados con `Database` real generado desde el schema
- `proxy.ts` (antes `middleware.ts`, migrado a la convención de Next 16) — refresca sesión y protege `/dashboard`
- Páginas `/login` y `/signup` con validación (`validate-auth-credentials`, testeada) usando los componentes del design system
- `/dashboard` — Server Component protegido que lee el `negocio` del usuario logueado

**33/33 tests pasando** (30 en `apps/web` + 3 en `packages/design-tokens`).

⏳ Pendiente: probar el signup real end-to-end desde tu máquina (este entorno no tiene salida de red hacia Supabase, solo vía MCP)

### FASE 3 — Agente IA Stateless ✅
- `lib/agent/system-prompt.ts` — genera el system prompt dinámico por negocio (nombre, tono, horarios, catálogo, tools según tier)
- `lib/agent/tools.ts` — 5 tool definitions en formato OpenRouter; tier base ve 3, tier pro ve las 5 (incluye `procesar_pago`, `aplicar_descuento`)
- `lib/agent/tool-handlers.ts` — ejecuta cada tool con **aislamiento multi-tenant explícito** (no confía solo en RLS, porque el webhook usa `service_role` que la bypasea) + bloqueo de `procesar_pago`/`aplicar_descuento` si el tier no es pro, como defensa en profundidad
- `lib/agent/openrouter-client.ts` — wrapper con retry (3 intentos)
- `lib/agent/handle-incoming-message.ts` — orquestador: busca negocio → historial → arma prompt → llama al modelo → ejecuta tool si corresponde (segundo round-trip) → persiste → responde por WhatsApp
- `lib/whatsapp/verify-signature.ts` — valida la firma HMAC-SHA256 de Meta (timing-safe, contra tampering)
- `lib/whatsapp/send-message.ts` — envía respuestas vía Meta Graph API
- `app/api/webhooks/whatsapp/route.ts` — `GET` (verificación de Meta) + `POST` (mensajes entrantes)
- `lib/supabase/service-client.ts` — cliente con `service_role`, solo para el webhook (documentado el riesgo de que bypasea RLS)

**65/65 tests pasando** (62 en `apps/web` + 3 en `packages/design-tokens`).

⏳ Pendiente: probar el webhook con un número de WhatsApp real (Fase 5) y credenciales reales de OpenRouter/Meta en `.env.local`

### Sub-proyecto A — Fundación: Rubro + Sistema de Tiers ✅
Ver spec completo en `docs/superpowers/specs/2026-09-14-fundacion-rubro-tiers-design.md`.

- `negocio.tipo_crm` ('ventas'|'turnos') + `negocio.rubro` — deciden qué CRM ve cada negocio
- `negocio.tier` extendido a `base`/`pro`/`premium` (swap: Pro = fidelización/combos/cuenta corriente, Premium = cobros MercadoPago/transferencias/billeteras)
- `lib/plans/features.ts` — `hasFeature()` con feature-gating híbrido: reglas fijas por tier en código + tabla `negocio_feature_overrides` para excepciones puntuales por negocio
- Columnas de facturación: `plan_ciclo_facturacion` (mensual/anual), `plan_fecha_alta`, `plan_fecha_vencimiento`, `plan_estado_pago`
- Tabla `clientes` + memoria cross-conversación: el agente ahora carga los últimos 10 mensajes de **todas** las conversaciones de un cliente con el negocio, no solo la activa
- Signup actualizado: pide `tipo_crm` y `rubro` al crear la cuenta
- Decisión documentada: LLM compartido vía OpenRouter para todos los negocios (no uno dedicado por negocio) — la personalización viene del contexto inyectado, no del modelo. BYOK (traer tu propia API key) queda en el backlog para negocios grandes.
- Backlog de ideas para la beta: recordatorios de recompra, lista de espera automática en turnos, encuestas de satisfacción, multi-idioma, referidos, reportes semanales al dueño

**76/76 tests pasando** (73 en `apps/web` + 3 en `packages/design-tokens`).

⏳ Próximo: sub-proyecto **C** (CRM Turnos/Citas) — requiere su propio brainstorming antes del plan, según el orden acordado A → C → B → D

### Sub-proyecto C1 — CRM Turnos/Citas: Backend ✅
Ver spec completo en `docs/superpowers/specs/2026-09-15-crm-turnos-citas-design.md`.

- `servicios` (duración variable, promociones, horario propio opcional), `recursos` (canchas/sillones/profesionales reservables en paralelo, con subtipo para fútbol 5/7/9/11)
- `citas` extendida: `servicio_id`, `recurso_id`, seña (`sena_requerida`/`sena_pagada`/`sena_metodo`), estados `no_show` y `reprogramada`
- `lista_espera` con opt-in — reemplaza la idea original de "colgar un estado" (inviable con la API real de WhatsApp, documentado el motivo técnico en el spec)
- `recordatorios_config` — sistema de alertas 100% configurable por negocio, no hardcodeado
- `reglas_reprogramacion` — reprogramación self-service del cliente vía el agente, validada contra estas reglas
- `negocio.plantillas_meta_habilitadas` — guardrail: si el dueño configura un recordatorio fuera de la ventana de 24hs sin tener plantillas de Meta aprobadas, el sistema lo va a alertar (lógica ya testeada en `reminder-guardrail.ts`; la UI que lo muestra es parte de C2)
- 4 features nuevas de tier Pro: `recordatorios_configurables`, `lista_espera_automatica`, `reprogramacion_self_service`, `gestion_senas`
- 2 tools nuevas del agente: `reprogramar_cita`, `anotar_lista_espera` — mismo aislamiento multi-tenant explícito que las 5 de Fase 3
- `findNextWaitlistCandidate()` — selecciona al próximo candidato de la lista de espera cuando se libera un turno (por orden de llegada, respetando servicio/recurso/franja pedidos)

**93/93 tests pasando** (90 en `apps/web` + 3 en `packages/design-tokens`).

⏳ Próximo: **C2** (Frontend — calendario, tarjetas de turnos, páginas de gestión de servicios/recursos/recordatorios), después **B** (CRM Ventas) y **D** (Panel Admin)

### Sub-proyecto C2 — CRM Turnos/Citas: Frontend ✅ (base funcional)
Ver spec completo en `docs/superpowers/specs/2026-09-15-crm-turnos-frontend-c2-design.md`.

- `pickCalendarView()` — auto-switch de vista Semana/Día según cantidad de recursos activos
- 3 features nuevas sin tier default (`multi_recurso`, `carga_manual_turnos`, `mobile_vista_scroll_horizontal`) — se activan por negocio puntual vía `negocio_feature_overrides`, mismo mecanismo de upsell que `plantillas_meta_habilitadas`
- Componentes `TurnoCard` (4 estados visuales) y `NoShowBadge`
- 4 páginas nuevas: `/turnos` (calendario), `/turnos/servicios`, `/turnos/recursos` (con el guardrail de multi-recurso visible), `/turnos/configuracion` (con el guardrail de recordatorios de C1 ya renderizado)
- Se encontró y corrigió un bug real: `/turnos` no estaba en las rutas protegidas del `proxy.ts` — daba 500 en vez de redirigir a login

**Nota de alcance**: esta es la base funcional completa (datos reales, gating real, componentes testeados). La capa de interacción más rica (grilla visual con columnas por recurso, carrusel swipe mobile, modales de alta) queda para afinar con uso real, como se conversó explícitamente.

**102/102 tests pasando** (99 en `apps/web` + 3 en `packages/design-tokens`).

**Backlog agregado**: gestión de clientes (tabla `clientes` ya existe desde sub-proyecto A) + campañas masivas de WhatsApp — se diseña en detalle en sub-proyecto D.

⏳ Próximo: sub-proyecto **B** (CRM Ventas) o iterar la capa visual de C2 con uso real

### Sub-proyecto B — CRM Ventas/Productos: Backend ✅
Ver spec completo en `docs/superpowers/specs/2026-09-15-crm-ventas-productos-design.md`.

- **Decisión de arquitectura clave**: JSON flexible (`productos.atributos`) en vez de columnas dinámicas por Excel subido — mismo resultado visual para el cliente (su propia tabla con sus propias columnas), sin el riesgo de seguridad ni el problema de escala de crear columnas reales por negocio
- `productos` extendido: `precio`, `stock`, `atributos jsonb`, `umbral_alerta_stock` (configurable por producto, según rotación/demanda)
- `ventas` + `venta_items` (múltiples productos y/o combos por venta) + `combos` (armados libremente por el dueño)
- `checkStockAlert()` — función pura testeada
- Tool `registrar_venta`: crea la venta + items, descuenta stock automáticamente, mismo aislamiento multi-tenant explícito que el resto de las tools
- Se ampliaron los rubros de "Ventas" en el signup: logística, paquetería, catering, marketing digital, autos usados — el diseño de atributos flexibles ya soportaba esto sin cambios de código
- Se encontraron y corrigieron **8 foreign keys sin índice** (algunas nuevas de B, otras que habían quedado sin cubrir desde C1) — resuelto el warning de performance `unindexed_foreign_keys` por completo
- Se corrigió el tipo `ToolDefinition` para soportar parámetros de tipo array con `items` anidado (necesario para `registrar_venta`)

**111/111 tests pasando** (108 en `apps/web` + 3 en `packages/design-tokens`).

**Nota de implementación documentada**: el descuento de stock usa un `update` simple, no atómico — suficiente para el volumen esperado del MVP, anotado en el código para migrar a una función RPC si el volumen de ventas simultáneas lo justifica.

⏳ Próximo: UI de B (carga de Excel, catálogo editable tipo spreadsheet, gestión de combos) o sub-proyecto D (Panel Admin)

### Sub-proyecto D1 — Panel Admin ✅ (base funcional)
Ver spec completo en `docs/superpowers/specs/2026-09-15-panel-admin-d1-design.md`.

- **Principio ético acordado con el usuario**: el panel NUNCA muestra las ventas/datos de negocio de los tenants — solo lo que compete a la plataforma (cuántos clientes hay, cómo crecen, cuánto se les factura por el servicio)
- Auth de admin **100% separada** de Supabase Auth de tenants: tabla `admins` (nunca alimentada por signup público), `hashPassword`/`verifyPassword` con scrypt y `createSessionToken`/`verifySessionToken` con HMAC — todo con `node:crypto`, sin dependencias nuevas
- `negocio.estado_cuenta` (activo/suspendido_pago/baja_definitiva) con **enforcement real en el webhook**: un negocio suspendido no llega a gastar tokens de OpenRouter, no solo "se ve distinto" en la UI
- `facturacion_negocio` — historial de lo que Matías le cobra a cada negocio (plan + adicionales), con RLS deny-by-default (solo accesible vía `service_role`)
- 3 páginas de lectura: `/admin` (feed de vencimientos + resumen), `/admin/negocios` (listado), `/admin/negocios/[id]` (detalle con overrides activos y facturación)
- Instrucciones paso a paso para que el usuario cree su propio usuario admin de forma privada (nunca se generó ni vio la contraseña en esta sesión)

**120/120 tests pasando** (117 en `apps/web` + 3 en `packages/design-tokens`).

**Nota de alcance**: las mutaciones desde la UI (activar/desactivar overrides, cambiar estado_cuenta, date-picker de alta) quedan para una iteración siguiente sobre esta base de lectura — mismo criterio usado entre C1 y C2.

⏳ Próximo: D2 (agente propio de Matías, WhatsApp + chat en el panel) o completar las mutaciones de D1

### Cierre de pendientes: mutaciones D1 + UI de B + D2 ✅

**Mutaciones de D1:**
- `computePlanFechaVencimiento` (mensual=30d, anual=365d), `requireAdminSession` (las rutas `/api/admin/*` necesitan su propio chequeo — `proxy.ts` solo protege páginas `/admin/*`, no las API routes)
- 3 rutas de mutación (`estado-cuenta`, `overrides`, `plan-alta`) + controles integrados en `/admin/negocios/[id]`

**UI de B (CRM Ventas):**
- `mapExcelRowToProducto` (nombre/precio/stock reconocidos, resto a `atributos` JSON) y `extractDynamicColumns` (columnas propias por negocio)
- Carga de Excel vía `xlsx`, página `/ventas/catalogo` (tabla tipo spreadsheet con columnas dinámicas + alertas de stock visibles), página `/ventas/combos`

**D2 — Agente propio de Matías:**
- Tools de solo lectura (`consultar_metricas_plataforma`, `consultar_facturacion_propia`) — **testeado explícitamente que nunca expone ventas de los tenants**, respetando el principio ético acordado
- Orquestador con tool-calling de dos vueltas (mismo patrón que el agente de los tenants, Fase 3)
- Canal **chat en el panel**: `/admin/chat` + `/api/admin/chat`, funcional
- Canal **WhatsApp**: requiere que Matías configure su propio número de Meta Business (independiente del de los tenants) — mismo tipo de paso externo que la aprobación de plantillas de Meta en C1. La lógica del agente (`handle-admin-chat-message.ts`) es agnóstica al canal, así que conectar WhatsApp más adelante es trabajo de wiring, no de rediseño.

**142/142 tests pasando** (139 en `apps/web` + 3 en `packages/design-tokens`).

## Estado completo del proyecto

| Sub-proyecto | Estado |
|---|---|
| A — Rubro + Tiers + Memoria | ✅ |
| C1 — CRM Turnos (backend) | ✅ |
| C2 — CRM Turnos (frontend base) | ✅ |
| B — CRM Ventas (backend + UI) | ✅ |
| D1 — Panel Admin (lectura + mutaciones) | ✅ |
| D2 — Agente propio (canal chat) | ✅ |
| D2 — Canal WhatsApp | ⏳ Requiere número de Meta propio |

⏳ Backlog abierto: campañas masivas + resumen IA de historial largo, sincronización con Google Calendar, sistema completo de cobro/logística para B, BYOK.

## Desarrollo post-debugging: 4 mejoras de arquitectura ✅

Tras las pruebas end-to-end reales (ver sección abajo), se implementaron 4
mejoras identificadas a partir de una arquitectura de referencia que trajo
el usuario:

1. **Bot desactivable por conversación + bloqueo de contacto**:
   `conversations.bot_desactivado`, `clientes.bloqueado`, con enforcement
   real en `handleIncomingMessage` (no solo a nivel UI)
2. **Calificación automática de lead + alerta por email**: `categorizeTemperatura`
   corre sola después de 3+ mensajes del usuario (sin depender de que el
   modelo decida usar una tool), dispara `sendLeadAlertEmail` (Resend) si
   sale "caliente" — **activable por negocio individual** desde el panel
   admin (`alertas_lead_caliente` + campo `email_alertas`), como upsell
3. **Embedded Signup**: estructura completa (botón, endpoint de intercambio
   de `code`, página `/configuracion/whatsapp`) para que un cliente real
   conecte su propio WhatsApp sin pasar por nada de lo que se hizo a mano en
   esta sesión — **requiere App Review de Meta aprobado para funcionar en
   vivo**, documentado en la Parte B del runbook
4. **Preview de Excel antes de importar + edición inline del catálogo**:
   el Excel se parsea en el navegador y se muestra una tabla de confirmación
   antes de tocar la base; precio/stock son editables directo en la tabla

**179/179 tests pasando.**

## Pruebas end-to-end reales — en curso

Empezamos a probar la app real (signup, login, CRM) en la máquina del usuario. Hallazgos:

- **Signup por UI bloqueado por rate limit de email** de Supabase (el servicio de correo gratuito tiene un límite muy bajo). Para seguir probando, se crean usuarios de prueba vía Admin API (`supabase.auth.admin.createUser`) en vez de INSERT directo a `auth.users` — el INSERT directo resultó en `Database error querying schema` al hacer login real, porque salteaba la creación de la fila correspondiente en `auth.identities`. La Admin API es el método correcto y confiable.
- **Bug real encontrado y corregido**: `TurnoCard` esperaba estados tipo `disponible`/`ocupado`, pero `citas.estado` en la base usa `pendiente`/`confirmada`/`cancelada`/`completada`/`no_show`/`reprogramada`. Se agregó `mapCitaEstadoToTurnoCardEstado()` (testeado) para traducir correctamente.
- **Pendiente real**: no existe todavía un sidebar de navegación entre páginas — cada ruta es standalone, se navega por URL directa. Anotado para la próxima iteración de UI.
- **Incidente de seguridad durante las pruebas**: se expuso por error un `service_role` key (legacy) y luego una `secret` key nueva en el chat. Ambas fueron reemplazadas. La legacy no pudo revocarse del todo por la complejidad del flujo de JWT Signing Keys de Supabase — queda pendiente revocarla formalmente más adelante (bajo riesgo mientras tanto: sin producción real, sin datos sensibles).

**144/144 tests pasando** (141 en `apps/web` + 3 en `packages/design-tokens`).

Ver el plan completo en `docs/superpowers/plans/2026-09-14-fase1-architecture-design-system.md`
y el design system completo en `docs/design-system/design-tokens.md`.

## Setup local

```bash
# Requisitos: Node >= 20, pnpm >= 9
pnpm approve-builds --all   # aprueba esbuild/unrs-resolver/sharp (primera vez)
pnpm install
pnpm dev                    # levanta apps/web en localhost:3000
pnpm test                   # corre toda la suite de tests (vitest)
```

Regenerar el CSS de tokens si se edita `packages/design-tokens/design-tokens.json`:

```bash
cd packages/design-tokens && npx tsx generate-css.ts
```

## Conectar este código a GitHub (matiastristan/Agentes-IA)

Este repo ya tiene 6 commits locales con historial completo (scaffold → tokens →
componentes → schema DB). Para subirlo:

```bash
# 1. Descomprimir el zip y entrar a la carpeta
cd saas-agente-ia

# 2. Verificar que el repo remoto existe y está vacío (o forzar si ya tiene un README inicial)
git remote add origin https://github.com/matiastristan/Agentes-IA.git

# 3a. Si el repo remoto está VACÍO:
git branch -M main
git push -u origin main

# 3b. Si el repo remoto YA tiene contenido (ej. README inicial de GitHub):
git pull origin main --allow-unrelated-histories
# resolver conflictos si los hay, luego:
git push -u origin main
```

Después de esto, cualquier branch nuevo sigue la convención documentada abajo.

## Branching

- `main`: siempre deployable, protegida (requiere PR + CI verde cuando se configure Fase 7)
- `feature/<nombre>`: una feature o task del plan por branch
- `fix/<nombre>`: bugfixes

Convención de commits: `feat:`, `fix:`, `chore:`, `docs:` (Conventional Commits).

## Supabase

Proyecto: **AgentesIA** — `https://supabase.com/dashboard/project/afleydeeytyfgpytlimm`

Las migraciones en `supabase/migrations/` ya están aplicadas en producción vía
Supabase MCP. Si necesitás recrear el schema en otro proyecto (ej. staging),
aplicalas en orden con el CLI de Supabase:

```bash
supabase link --project-ref <tu-project-ref>
supabase db push
```

## Stack

Next.js 16 · React 19 · Tailwind 4 · TypeScript · Supabase (Postgres + Auth + RLS) · Vitest · pnpm workspaces
