# Deploy a Vercel — Guía paso a paso

## 0. Prerrequisito: el código ya tiene que estar en GitHub

Ya lo está (`matiastristan/Agentes-IA`, rama `main`). Confirmá que subiste el
último commit antes de seguir:

```powershell
cd "C:\Users\mtris\OneDrive\Documentos\Matias\Agente IA\saas-agente-ia"
git log --oneline -1
git push origin main
```

## 1. Conectar Vercel a tu GitHub

1. https://vercel.com/signup → "Continue with GitHub" (usá la misma cuenta
   de GitHub donde está el repo)
2. Si es tu primera vez, te va a pedir instalar la "Vercel GitHub App" en tu
   cuenta — dale acceso al repo `Agentes-IA` (o a todos tus repos, como
   prefieras)

## 2. Importar el proyecto

1. En el dashboard de Vercel → **"Add New..." → "Project"**
2. Buscá y seleccioná `Agentes-IA` → **"Import"**
3. **Root Directory**: como es un monorepo, cambiá esto a `apps/web`
   (Vercel detecta automáticamente Next.js una vez que apuntás ahí)
4. Framework Preset debería quedar en "Next.js" automáticamente

## 3. Cargar las variables de entorno

**Antes de hacer click en "Deploy"**, expandí la sección **"Environment
Variables"** y cargá cada una (los valores los tenés en tu `.env.local`
local — copialos de ahí, no de ningún otro lado):

| Variable | Dónde conseguirla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Ya la tenés en `.env.local` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Ya la tenés en `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya la tenés en `.env.local` (la `sb_secret_...`) |
| `OPENROUTER_API_KEY` | Ya la tenés en `.env.local` |
| `META_APP_SECRET` | Ya la tenés en `.env.local` |
| `META_VERIFY_TOKEN` | Ya la tenés en `.env.local` |
| `ADMIN_SESSION_SECRET` | Ya la tenés en `.env.local` |
| `RESEND_API_KEY` | Ya la tenés en `.env.local` (si la configuraste) |
| `NEXT_PUBLIC_META_APP_ID` | Solo si ya armaste el Embedded Signup |
| `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` | Solo si ya armaste el Embedded Signup |

Marcá las 3 casillas de entorno (Production, Preview, Development) para cada
una, salvo que quieras valores distintos por ambiente (no es necesario para
empezar).

## 4. Deploy

Click **"Deploy"**. Tarda 2-5 minutos. Al terminar te da una URL tipo
`https://agentes-ia-xxxx.vercel.app` — esa ya es tu app funcionando en
internet real.

## 5. Actualizar las URLs que dependen del dominio

Una vez que tengas la URL de Vercel (o tu dominio propio si conectás uno):

### Webhook de WhatsApp en Meta
WhatsApp → Configuración → Webhook → Editar → Callback URL:
```
https://tu-dominio.vercel.app/api/webhooks/whatsapp
```
(reemplaza la URL de ngrok que usábamos para desarrollo — ngrok y las
pruebas locales ya no hacen falta una vez que esto está en producción)

### Redirect de reset de contraseña
Ya está resuelto en el código — usa `window.location.origin` automáticamente,
no hay que tocar nada ahí.

### Embedded Signup (si ya lo armaste)
Facebook Login for Business → Configuraciones → Ajustes → agregar tu dominio
real de Vercel/producción en los campos de OAuth.

## 6. Conectar un dominio propio (opcional, cuando quieras)

Vercel → tu proyecto → **Settings → Domains** → agregá tu dominio (ej.
`factoria.app` o el que hayas comprado) → seguí las instrucciones de DNS que
te da Vercel.

## 7. Deploys futuros — automáticos

A partir de acá, **cada vez que hagas `git push origin main`**, Vercel
redeploya solo. No hace falta repetir ningún paso de este documento salvo
que agregues una variable de entorno nueva.

## Checklist final antes de invitar al primer cliente real

- [ ] Deploy exitoso, la URL carga
- [ ] Probaste login/signup en la URL real (no localhost)
- [ ] Webhook de WhatsApp apuntando a la URL de producción, verificado en Meta
- [ ] `pnpm install` corrido localmente para resolver las vulnerabilidades de
      dependencias documentadas en `AUDITORIA-2026-09-16.md`
- [ ] Considerar activar "Leaked Password Protection" en Supabase (mismo
      documento)
