# FactorIA — Tu Fábrica de Agentes

SaaS multi-tenant de Agente IA por WhatsApp para pequeños negocios (turnos y
ventas), con panel de administración de plataforma. Este archivo es contexto
para Claude Code — se lee automáticamente al abrir esta carpeta.

## Quién soy y cómo trabajamos

El dueño del proyecto (Matías) es emprendedor, no developer — todo el código
se construyó a través de sesiones de chat con Claude (claude.ai), con Matías
copiando/pegando comandos de PowerShell en su máquina Windows. Este es el
primer uso de Claude Code en el proyecto. Las convenciones de abajo reflejan
cómo se construyó hasta ahora — mantenelas.

## Stack técnico

- Next.js 16 (App Router) + React 19 + Tailwind 4 + TypeScript
- Supabase (Postgres + Auth + RLS) — proyecto `afleydeeytyfgpytlimm`
- LLM: OpenRouter, con fallback entre modelos gratuitos (`openrouter/free`,
  `z-ai/glm-5.2:free`, `google/gemma-4-26b-a4b-it:free`,
  `google/gemma-4-31b-it:free`) — ver `lib/agent/handle-incoming-message.ts`
- WhatsApp: Meta Cloud API v21+, Embedded Signup para onboarding de clientes
- Resend para emails transaccionales (alertas de lead caliente)
- Vitest + Testing Library, pnpm workspaces (monorepo)
- Motion, Sonner, @dnd-kit (rediseño visual, kanban pendiente)

## Estructura del monorepo

```
apps/web/                          Next.js app (todo el código vive acá)
  app/(tenant)/                    Rutas del negocio: dashboard, turnos, ventas, configuracion
  app/admin/(dashboard)/           Rutas del panel admin (auth separado, cookie propia)
  app/admin/login/                 Login de admin (fuera del layout con sidebar)
  app/api/                         Route handlers (webhook, admin, negocio)
  lib/agent/                       Orquestación del agente IA (handleIncomingMessage, tools)
  lib/admin/                       Auth de admin (hash-password, session-token — node:crypto, sin deps)
  lib/turnos/, lib/ventas/         Lógica de negocio pura, testeada
  lib/whatsapp/                    Envío de mensajes, normalización de teléfonos
  lib/meta/                        Embedded Signup (exchange-code-for-token)
  lib/notifications/               Alertas de lead caliente (Resend)
  components/                      UI (ui/ = primitivos, resto = por feature)
  supabase/migrations/             SQL, ya aplicado en producción vía Supabase MCP
packages/design-tokens/            3 paletas de color (warm/cool/vibrant) por negocio
docs/superpowers/
  specs/                           Specs de diseño de cada sub-proyecto (A, B, C1, C2, D1, D2)
  plans/                           Planes de implementación TDD task-by-task
  runbooks/                        Guías operativas (Meta WhatsApp, deploy a Vercel)
  AUDITORIA-2026-09-16.md          Auditoría de seguridad/performance
```

## Multi-tenancy — el patrón que NUNCA hay que romper

Cada tabla de negocio tiene `tenant_id`, con RLS `tenant_id = (select auth.uid())`.
El webhook de WhatsApp usa `service_role` (bypasea RLS) pero **cada tool del
agente filtra por `tenant_id` explícitamente en el código**, nunca confía
en argumentos del modelo para eso — ver `lib/agent/tool-handlers.ts` y su
test, que verifica aislamiento cruzado entre tenants.

## Arquitectura del agente (webhook → respuesta)

```
POST /api/webhooks/whatsapp
  → verifyMetaSignature (HMAC, timing-safe)
  → findNegocioByPhoneNumberId (service_role)
  → chequea negocio.estado_cuenta === 'activo' (si no, corta ahí, sin gastar tokens)
  → chequea clientes.bloqueado (si está bloqueado, corta ahí)
  → guarda el mensaje del usuario
  → si negocio tiene alertas_lead_caliente habilitada: categoriza temperatura
    en paralelo (independiente del bot_desactivado) y dispara email si corresponde
  → chequea conversations.bot_desactivado (si está activo un vendedor humano, corta acá)
  → buildSystemPrompt + getToolsForTier + callOpenRouter (con fallback de modelos)
  → si hay tool_call: executeToolCall (aislamiento multi-tenant) + segundo round-trip
  → sendWhatsAppMessage (guarda wamid + status: sent/failed, nunca falla en silencio)
```

## Sub-proyectos — estado

| Sub-proyecto | Qué es | Estado |
|---|---|---|
| A | Rubro/tiers/hasFeature/facturación/clientes | ✅ |
| C1 | CRM Turnos backend (servicios, recursos, lista de espera) | ✅ |
| C2 | CRM Turnos frontend base | ✅ |
| B | CRM Ventas (Excel con preview, catálogo editable inline, combos) | ✅ |
| D1 | Panel Admin (negocios, estados, overrides, facturación) | ✅ |
| D2 | Agente propio del dueño (chat en panel, WhatsApp pendiente) | ✅ parcial |
| — | Bot desactivable por conversación + bloqueo de contacto | ✅ |
| — | Alerta de lead caliente (categorización automática + email por Resend) | ✅ |
| — | Embedded Signup (onboarding de clientes reales, sin pasar por Meta Developers) | ✅ código, pendiente App Review de Meta |
| — | Rediseño visual completo (login, signup, dashboard, sidebar, admin) | ✅ |
| — | Auditoría de seguridad/performance | ✅ (ver AUDITORIA-2026-09-16.md) |
| — | Kanban de leads por temperatura | ⏳ no empezado (dnd-kit instalado, sin usar) |
| — | Widget de reserva público (cliente final, sin WhatsApp) | ⏳ no empezado — hay referencia visual en README |
| — | Cuenta abierta / consumo en vivo (canchas, barbería, etc.) | ⏳ diseño conversado, no implementado |
| — | Landing de autogestión (self-service signup por rubro) | ⏳ backlog explícito, para después |

## Variables de entorno (`apps/web/.env.local`, ver `.env.local.example`)

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   # públicas
SUPABASE_SERVICE_ROLE_KEY        # sb_secret_..., NUNCA la legacy JWT
OPENROUTER_API_KEY
META_APP_SECRET, META_VERIFY_TOKEN
ADMIN_SESSION_SECRET             # inventado, firma sesiones de /admin
RESEND_API_KEY
NEXT_PUBLIC_META_APP_ID, NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID  # públicas, son de la plataforma, no de cada cliente
```

## Convenciones de desarrollo

- **TDD siempre**: test primero (falla), implementación, test pasa, commit.
  Ver cualquier archivo en `docs/superpowers/plans/` para el patrón exacto.
- **Migraciones**: vía Supabase MCP (`apply_migration`), después guardadas
  como archivo local en `supabase/migrations/NNNN_nombre.sql` para que
  queden versionadas. Siempre correr `get_advisors` (security + performance)
  después de aplicar.
- **Verificación antes de dar algo por terminado**: `npx tsc --noEmit` (sin
  filtrar nada — ver "Lecciones" abajo) + `npx vitest run` en `apps/web` Y
  en `packages/design-tokens` + smoke test real de las rutas afectadas
  (`curl` con el server levantado) + para cambios grandes, `next build`
  real de producción.
- **Nunca commitear secretos**. `.env.local` está en `.gitignore`. Si algo
  se expone por error, se rota inmediatamente (ver historial de commits de
  seguridad).
- Motion/animaciones: tokens en `app/globals.css` (`--ease-out-strong`,
  `--duration-*`, clase `.animate-fade-slide-in`), nunca `transition: all`.

## Lecciones aprendidas (evitar repetir)

1. **`tsc --noEmit` filtrando `*.test.*` esconde errores reales** — el build
   de producción (`next build`) SÍ tipa los tests, y falló por un mismatch
   entre `@testing-library/jest-dom` (para Jest) y `@testing-library/jest-dom/vitest`
   (el correcto acá, ya corregido en `vitest.setup.ts` + `tsconfig.json`).
2. **`vitest` tenía versiones distintas entre el root del monorepo y
   `apps/web`** — causaba que el runtime real (2.1.9) no coincidiera con lo
   declarado en `package.json` (^5.0.0), rompiendo matchers de jest-dom en
   silencio. Ya alineado.
3. **Páginas que usan `createServiceClient()` (sin `cookies()`) necesitan
   `export const dynamic = 'force-dynamic'`** — si no, Next intenta
   pre-renderizarlas como estáticas en build y falla (o peor, sirve datos
   viejos cacheados). Ya aplicado en las 3 páginas de `/admin/(dashboard)`.
4. **`xlsx` (paquete npm) tiene vulnerabilidades sin parchear en el registro
   de npm** — SheetJS solo publica versiones arregladas en su propio CDN.
   `package.json` ya apunta a `https://cdn.sheetjs.com/xlsx-0.20.3/...tgz`
   — correr `pnpm install` en una máquina con acceso real a internet para
   que se resuelva (el sandbox de Claude en claude.ai no llega a ese dominio).
5. **`FB.login()` de Meta rechaza en runtime que el callback sea una función
   `async` directamente** ("Expression is of type asyncfunction, not
   function") — hay que envolver la lógica async en una función interna no-async.
   Ver `components/negocio/conectar-whatsapp-button.tsx`.
6. **Embedded Signup de Meta exige HTTPS real**, ni HTTP plano ni túneles
   ngrok inestables sirven bien. Para desarrollo local: `next dev
   --experimental-https` + un dominio con punto en el nombre (Meta rechaza
   "localhost" pelado en su lista de dominios autorizados) — usar `lvh.me`
   (resuelve a 127.0.0.1 por DNS público, sin tocar el archivo hosts) +
   regenerar el certificado de mkcert para que cubra ambos nombres + agregar
   `allowedDevOrigins: ["lvh.me", "*.lvh.me"]` en `next.config.ts` (si no,
   Next.js bloquea en silencio los pedidos del dev server y la hidratación
   de React falla sin error visible — parece un bug del formulario pero es
   esto).
7. **El dashboard de Meta cambió a un formato por "casos de uso"** — nada de
   "Agregar productos" clásico. Ver Parte C de
   `docs/superpowers/runbooks/meta-whatsapp-setup.md` para el flujo real
   verificado (Incorporación de proveedores de tecnología → Creador de
   registro insertado).
8. **Meta acepta "Sole Proprietorship"** para Business Verification — no
   hace falta una sociedad constituida. En Argentina, Monotributo (ARCA) +
   Constancia de Inscripción alcanza como documento.

## Documentos clave para leer antes de tocar algo grande

- `docs/superpowers/runbooks/meta-whatsapp-setup.md` — Meta/WhatsApp completo
- `docs/superpowers/runbooks/vercel-deploy-guide.md` — deploy paso a paso
- `docs/superpowers/AUDITORIA-2026-09-16.md` — hallazgos de seguridad/perf
- `README.md` — bitácora completa de todas las sesiones, con detalle de cada
  sub-proyecto y los bugs reales encontrados en pruebas end-to-end

## Estado de git/deploy al momento de escribir esto

- Repo: `matiastristan/Agentes-IA`, rama `main`, 133 commits
- Supabase: proyecto `afleydeeytyfgpytlimm`, ya con todas las migraciones aplicadas
- Vercel: proyecto `factor-ia` en proceso de conectar (equipo `mattris`) —
  puede que ya esté conectado si seguiste la guía de deploy, o pendiente
- Meta: App de WhatsApp con Embedded Signup configurado (App ID y Config ID
  ya en `.env.local`), Business Verification pendiente de Matías
