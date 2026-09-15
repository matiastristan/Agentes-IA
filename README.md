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
