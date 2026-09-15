# Guía: Conectar WhatsApp Cloud API desde cero (sin errores)

Consolidado de todo lo que encontramos en la sesión de debugging real. Seguí el
orden exacto — cada paso existe porque saltearlo causó un error específico.

## 0. Prerrequisito: usá tu cuenta de Facebook VIEJA

Nunca una cuenta recién creada. Facebook bloquea acciones sensibles (crear
Business Portfolio, ver el App Secret) en cuentas nuevas durante un tiempo
indeterminado (el mensaje dice "una hora" pero en la práctica puede tardar más).
Logueate con tu cuenta personal de siempre antes de empezar cualquier otra cosa.

## 1. Crear la App

1. https://developers.facebook.com → "Mis Apps" → "Crear App" → tipo **Business**
2. Cuando pida el **Business Portfolio**: poné un nombre de negocio/proyecto
   (ej. "AgentesIA"), **nunca tu nombre personal** — el campo lo rechaza a propósito

## 2. Agregar WhatsApp y conseguir el número de prueba

1. Menú izquierdo → "Agregar productos" → "WhatsApp" → "Configurar"
2. En "Introducción" vas a ver, gratis y ya listos:
   - **Phone Number ID** (un ID interno, no es el número de teléfono)
   - **Temporary access token** (dura 24hs)
   - El **número de teléfono real** (con código de país, ej. +1 555...) en el campo "From"
3. Agregá tu propio WhatsApp como destinatario de prueba (campo "To") y completá
   el código OTP que te llega por WhatsApp para verificarlo

## 3. Exponer tu servidor local (para desarrollo, sin deploy)

```powershell
# Descargar ngrok, configurar authtoken una sola vez:
ngrok config add-authtoken TU_TOKEN_DE_NGROK_DASHBOARD

# Con pnpm dev corriendo en OTRA terminal:
.\ngrok.exe http 3000
```

Copiá la URL `https://algo.ngrok-free.dev` que te muestra "Forwarding".

## 4. Configurar el Verify Token ANTES de tocar Meta

Este es un string que **vos inventás** — no lo da Meta. Tiene que estar en tu
`.env.local` **antes** de intentar verificar el webhook en Meta, si no la
verificación falla.

```powershell
Add-Content .env.local "META_VERIFY_TOKEN=tu-string-secreto-inventado"
```

Reiniciá `pnpm dev` (Ctrl+C, `pnpm dev` de nuevo) para que tome el valor.

## 5. Configurar el Webhook en Meta

1. WhatsApp → "Configuración" → sección "Webhook" → "Editar"
2. Callback URL: `https://tu-url-de-ngrok.ngrok-free.dev/api/webhooks/whatsapp`
3. Verify token: el mismo string exacto del paso 4
4. "Verificar y guardar"
5. **Bajá el scroll** hasta la lista "Campos del webhook" y activá el toggle de
   **"messages"** — sin esto, la verificación pasa pero nunca llegan mensajes reales

## 6. Registrar el número de teléfono (paso separado, fácil de saltear)

En la misma página de tareas de WhatsApp, hay un ítem aparte:
**"Registra tu número de teléfono de WhatsApp"**. Completalo (puede pedir un
PIN de 6 dígitos que vos elegís). Si dice "ya está registrado", andá a
WhatsApp Manager → Números de teléfono y confirmá que diga **"Conectado"** —
si es así, ya está bien, fue solo un reintento de un paso ya hecho.

## 7. CRÍTICO — Suscribir la App al WABA (el paso que más se salta)

Configurar el webhook en la App **no conecta automáticamente** la Cuenta de
WhatsApp Business (WABA) con tu App — son entidades separadas. Sin este paso,
los mensajes reales nunca llegan (aunque la verificación del webhook haya
funcionado perfecto). Se llama "Shadow Delivery" y es la causa más común de
"webhook configurado pero no llega nada".

1. Conseguí el **WABA ID**: WhatsApp Manager → tu cuenta de WhatsApp Business →
   "Identificador" (un número largo, ej. 3299731873703044)
2. https://developers.facebook.com/tools/explorer/
3. Arriba a la derecha, "App de Meta" → seleccioná **tu App** (no una genérica)
4. Cambiá el método a **POST**
5. En el campo de la consulta escribí: `{WABA_ID}/subscribed_apps` (con tu ID real)
6. "Enviar" → tiene que devolver `{"success": true}`

(Podés verificar el estado ANTES con GET al mismo endpoint — si la respuesta
muestra una app que no es la tuya, ese es exactamente el problema.)

## 8. Conseguir el App Secret

1. Configuración de la App → "Básica" (Settings → Basic)
2. Click "Mostrar" al lado de "Clave secreta de la app" / "App Secret"
3. Si no te deja verlo → volvé al punto 0, es la cuenta nueva bloqueando la acción

```powershell
Add-Content .env.local "META_APP_SECRET=tu-app-secret-real"
```

## 9. Guardar el Phone Number ID y el Access Token en tu negocio

El `phone_number_id` no es secreto, pero el `access_token` sí. Usá un script
descartable (nunca pegues el token en un chat):

```powershell
@"
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function main() {
  const { error } = await supabase
    .from('negocio')
    .update({
      phone_number_id: 'TU_PHONE_NUMBER_ID',
      access_token: 'TU_TOKEN_TEMPORAL',
      meta_connection_status: 'connected'
    })
    .eq('tenant_id', 'TU_TENANT_ID');
  if (error) { console.error('ERROR:', error); return; }
  console.log('Guardado OK');
}
main();
"@ | Out-File -Encoding utf8 guardar-meta.cjs

node --env-file=.env.local guardar-meta.cjs
del guardar-meta.cjs
```

## 10. Verificar el circuito completo antes de probar con WhatsApp real

Checklist de "todo verde" antes de mandar el primer mensaje:

- [ ] `pnpm dev` corriendo, sin errores en la terminal
- [ ] `ngrok http 3000` corriendo, mismo URL que configuraste en Meta
- [ ] `.env.local` tiene: `META_APP_SECRET`, `META_VERIFY_TOKEN`, sin líneas duplicadas ni vacías (`Get-Content .env.local | Select-String "META_"` para chequear)
- [ ] Webhook en Meta: verificado ✅, campo "messages" suscripto ✅
- [ ] Número de teléfono: "Conectado" en WhatsApp Manager ✅
- [ ] `subscribed_apps` del WABA devuelve TU app, no una genérica ✅
- [ ] `negocio.phone_number_id` y `negocio.access_token` cargados en Supabase ✅

## 11. Probar

Mandale un WhatsApp normal al número de prueba desde tu celular. Mirá
`http://127.0.0.1:4040` (inspector de ngrok) — tiene que aparecer un `POST` a
`/api/webhooks/whatsapp` con status **200** (no 401 — si da 401, revisá el
`META_APP_SECRET` del paso 8).
