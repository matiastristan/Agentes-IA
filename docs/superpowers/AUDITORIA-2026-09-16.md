# Auditoría de Seguridad y Performance

Realizada con `/vercel-react-best-practices` (Vercel Engineering) + revisión
manual de seguridad. Fecha: 2026-09-16.

## Hallazgos y correcciones aplicadas

### 1. Waterfalls de queries — CRÍTICO (corregido)

**7 páginas** hacían sus consultas a Supabase una detrás de otra cuando la
mayoría eran independientes entre sí (solo dependían del `user.id`, no unas
de otras). Cada query secuencial de más agrega una vuelta completa de latencia
a Supabase — en el peor caso (`/turnos/recursos`, 3 queries independientes)
esto significaba hasta 3x más tiempo de carga del necesario.

Corregido con `Promise.all()` en:
- `/turnos` (recursos + citas)
- `/turnos/recursos` (negocio + overrides + recursos)
- `/turnos/configuracion` (negocio + reglas)
- `/ventas/combos` (productos + combos)
- `/configuracion/alertas` (negocio + override)
- `/admin` (porVencer + totalActivos)
- `/admin/negocios/[id]` (negocio + overrides + facturación)

Páginas con una sola query después de `getUser()` (dashboard, servicios,
catálogo, WhatsApp) no tenían nada que paralelizar — ya estaban óptimas.

### 2. Bundle size — CRÍTICO (corregido)

`xlsx` (7.3 MB) se importaba de forma estática en `ExcelUploader`, lo que
significa que **todo visitante de `/ventas/catalogo` descargaba esa librería
completa**, incluso si nunca subía un Excel. Cambiado a import dinámico
(`await import('xlsx')`) dentro del handler de selección de archivo — ahora
se descarga solo cuando el usuario efectivamente elige un archivo.

### 3. Autenticación de rutas API — verificado, sin hallazgos

Se revisaron las **8 rutas API** del proyecto. Las 8 exigen algún mecanismo
de autenticación correcto según su naturaleza:
- Rutas de negocio: `supabase.auth.getUser()`
- Rutas de admin: `requireAdminSession()` (cookie propia, independiente)
- Webhook de WhatsApp: `verifyMetaSignature()` (firma HMAC de Meta)

La única ruta sin chequeo de sesión es `/api/admin/login` — correcto, es el
propio endpoint de login, tiene que ser accesible sin sesión previa.

### 4. Secretos hardcodeados — verificado, sin hallazgos

Barrido de patrones de API keys/tokens (`sk-`, `sb_secret_`, `eyJhbGci`,
`ghp_`) en todo el código fuente. Ninguno encontrado — todas las credenciales
se leen de variables de entorno.

### 5. `.env.local` — verificado, nunca subido a git

Confirmado en `.gitignore` y ausente del historial completo de commits.

### 6. RLS (Row Level Security) — al día

Todas las tablas tienen RLS habilitado. Las únicas advertencias del linter de
Supabase son intencionales y ya documentadas en el código:
- `admins` y `facturacion_negocio`: RLS sin policies (deny-by-default a
  propósito, solo accesibles vía `service_role`)
- `rls_auto_enable()`: función de infraestructura propia de Supabase, no
  nuestra

## Pendiente — acción manual recomendada (no urgente)

**Leaked Password Protection está deshabilitado** en Supabase Auth. Es un
toggle del lado de Supabase (no de código) que rechaza contraseñas
comprometidas conocidas (vía HaveIBeenPwned) al registrarse o cambiar
contraseña. Recomendado activarlo antes de invitar usuarios reales:

Supabase Dashboard → Authentication → Policies → buscar "Leaked password
protection" → activar.

## No evaluado en esta pasada (fuera de alcance por ahora)

- Categorías de bajo impacto de la skill (JS performance, advanced patterns)
  — no hay código con loops/manipulación de datos lo suficientemente pesada
  todavía para que estas reglas apliquen de forma significativa

## Vulnerabilidades de dependencias (`pnpm audit`) — acción requerida de tu lado

Corrí `pnpm audit`: **9 vulnerabilidades** (1 crítica, 3 altas, 5 moderadas).
Ya arreglé lo que se puede arreglar por código; lo que queda requiere que vos
corras un comando en tu máquina, porque **mi entorno no tiene salida de red
hacia los dominios necesarios** (ni `cdn.sheetjs.com` ni un registro npm con
la versión nueva de golpe).

### `xlsx` (ALTA — Prototype Pollution + ReDoS) — corregido en package.json, falta instalar

SheetJS (el mantenedor de `xlsx`) **dejó de publicar versiones parcheadas en
el registro de npm** — desde hace tiempo solo distribuye los fixes por su
propio CDN. La versión que teníamos (`0.18.5`, desde npm) tiene ambas
vulnerabilidades sin parchear en ese canal.

Ya cambié `apps/web/package.json` para apuntar a la build parcheada oficial:
```
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```
La API es idéntica (mismo `XLSX.read`, `XLSX.utils.sheet_to_json`) — no hace
falta tocar ningún código nuestro. Falta que corras `pnpm install` en tu
compu para que se descargue de verdad.

### `vitest` (CRÍTICA — solo si corrés `vitest --ui`, que nunca usamos)

`package.json` ya pedía `vitest ^5.0.0` (por encima de la versión parcheada
`4.1.11`) — lo que está desactualizado es lo que ya tenés instalado
localmente (`node_modules`/lockfile con `2.1.9`). Un `pnpm install` normal
también resuelve esto. Nota de contexto: esta vulnerabilidad solo aplica si
alguna vez corrés `vitest --ui` (un modo con interfaz web) — nunca lo usamos
en este proyecto (siempre `vitest run`), así que el riesgo real hasta ahora
era bajo, pero no cuesta nada estar del lado seguro.

### Paso único para resolver ambas

```powershell
cd "C:\Users\mtris\OneDrive\Documentos\Matias\Agente IA\saas-agente-ia"
pnpm install
pnpm audit
```
El segundo comando debería mostrar 0 (o muy pocas) vulnerabilidades después.
