# Guía Completa: Conectar WhatsApp a la Plataforma

Dos caminos completamente distintos:

- **Parte A**: número de prueba, para desarrollo — todo lo que configuramos hoy,
  paso a paso, sin saltear nada.
- **Parte B**: número real de un cliente, en producción — el camino que un
  negocio real va a usar, sin tocar Meta Developers, sin ngrok, sin nada de
  lo de la Parte A. Se llama **Embedded Signup** y hay que construirlo.

---

# PARTE A — Número de prueba (desarrollo)

## 0. Prerrequisito: cuenta de Facebook vieja

Nunca uses una cuenta de Facebook recién creada. Facebook bloquea acciones
sensibles (crear Business Portfolio, ver el App Secret) en cuentas nuevas
durante un tiempo indeterminado. Logueate con tu cuenta personal de siempre.

## 1. Crear la App de Meta

1. https://developers.facebook.com → "Mis Apps" → "Crear App" → tipo **Business**
2. Business Portfolio: nombre de negocio/proyecto (ej. "FactorIA"), **nunca**
   tu nombre personal — el campo lo rechaza a propósito.

## 2. Agregar WhatsApp y conseguir el número de prueba

1. "Agregar productos" → "WhatsApp" → "Configurar"
2. En "Introducción" vas a ver gratis: **Phone Number ID**, **Temporary
   access token** (24hs), y el número real en el campo "From"
3. Agregá tu propio WhatsApp como destinatario de prueba (campo "To") y
   completá el OTP. **Esto es por-app**: si creás una app nueva, hay que
   repetirlo, no se hereda de una app anterior.

## 3. Levantar el servidor y exponerlo con ngrok

```powershell
# Terminal 1 — servidor
cd apps\web
pnpm dev

# Terminal 2 — túnel (dejar corriendo, no cerrar)
ngrok config add-authtoken TU_TOKEN_DE_NGROK_DASHBOARD   # una sola vez
.\ngrok.exe http 3000
```

Copiá la URL `https://algo.ngrok-free.dev`. **Se regenera cada vez que
reiniciás ngrok** — si cambia, hay que actualizar el Callback URL en Meta.

## 4. Variables de entorno (`.env.local`) — antes de tocar Meta

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # sb_secret_..., nunca la legacy
ADMIN_SESSION_SECRET=...                # inventado, node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
OPENROUTER_API_KEY=...                  # de openrouter.ai/keys
META_VERIFY_TOKEN=...                   # inventado por vos, el mismo valor va en Meta
META_APP_SECRET=...                     # de Meta, Configuración → Básica
```

**Verificar siempre** (no solo poner el valor — confirmar que no haya
duplicados ni líneas vacías, es el error más común de esta sesión):

```powershell
$l = Get-Content .env.local | Select-String "^NOMBRE_DE_LA_VARIABLE="
Write-Host "Líneas:" $l.Count
Write-Host "Longitud:" ($l -replace "NOMBRE_DE_LA_VARIABLE=", "").Length
```

Reiniciar `pnpm dev` después de cualquier cambio al `.env.local`.

## 5. Configurar el Webhook en Meta

1. WhatsApp → "Configuración" → "Webhook" → "Editar"
2. Callback URL: `https://tu-url-de-ngrok.ngrok-free.dev/api/webhooks/whatsapp`
3. Verify token: el mismo string exacto de `META_VERIFY_TOKEN`
4. "Verificar y guardar"
5. Bajá a "Campos del webhook" → activá **"messages"**

Si falla la verificación: probá el endpoint a mano en el navegador primero
(`?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=12345`, debe
devolver `12345`) para descartar que el problema sea la URL o el token antes
de sospechar del código.

## 6. Registrar el número de teléfono

Tarea separada en la lista de WhatsApp: **"Registra tu número de teléfono de
WhatsApp"**. Si dice "ya registrado", confirmá en WhatsApp Manager que diga
**"Conectado"** — si es así, ya está.

## 7. CRÍTICO — Suscribir la App al WABA (el paso que más se salta)

Configurar el webhook en la App **no conecta automáticamente** la Cuenta de
WhatsApp Business (WABA) con la App. Sin esto, verificás el webhook OK pero
nunca llega un mensaje real ("Shadow Delivery").

1. WABA ID: WhatsApp Manager → tu cuenta → "Identificador"
2. https://developers.facebook.com/tools/explorer/ → App de Meta: la tuya
3. Método **POST** → consulta: `{WABA_ID}/subscribed_apps` → "Enviar"
4. Debe devolver `{"success": true}`. Podés verificar antes con GET al
   mismo endpoint — si muestra una app que no es la tuya, ese es el problema.

## 8. Token de acceso: usar un System User, no el temporal

El token temporal de "Introducción" vence en 24hs — para una sesión de
desarrollo de varias horas, se vence en el medio y da error 401. Crear uno
permanente:

1. https://business.facebook.com → Configuración del negocio → Usuarios →
   Usuarios del sistema → "Agregar" → rol Admin
2. "Asignar activos" → pestaña Apps → tu app → Control total → Asignar
3. "Asignar activos" de nuevo → pestaña Cuentas de WhatsApp Business → tu
   WABA → Control total → Asignar
4. "Generar token" → tu App → marcar `whatsapp_business_messaging` y
   `whatsapp_business_management` → expiración "Nunca" si aparece → Generar
5. Meta lo muestra **una sola vez** — copiarlo ahí mismo

## 9. Guardar phone_number_id y access_token en tu negocio

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
      access_token: 'TU_TOKEN_PERMANENTE',
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

**Nunca pegar el token ni el App Secret ni ninguna key en el chat con el
asistente** — todos estos scripts corren en tu máquina y leen del
`.env.local` local, no hace falta que la IA los vea nunca.

## 10. Bug conocido — números argentinos (error 131030)

Si mandás una respuesta y da `(#131030) Recipient phone number not in
allowed list` aunque el número esté verificado: el `wa_id` que llega en el
webhook para números argentinos incluye un **9 extra** después del `54`
(ej. `5493876289131`), pero Meta espera el formato sin ese 9 al **enviar**
(`543876289131`). Ya está resuelto en el código
(`lib/whatsapp/normalize-phone-for-sending.ts`) — si ves este error en un
número de OTRO país, puede ser un caso nuevo a investigar.

## 11. Checklist final antes de probar

- [ ] `pnpm dev` y `ngrok` corriendo, sin errores
- [ ] `.env.local`: todas las variables, sin duplicados ni vacías
- [ ] Webhook verificado ✅, "messages" suscripto ✅
- [ ] Número "Conectado" en WhatsApp Manager ✅
- [ ] `subscribed_apps` del WABA devuelve tu app ✅
- [ ] `negocio.phone_number_id`/`access_token` cargados, token de System User (no temporal) ✅
- [ ] Tu número agregado como destinatario de prueba **en esta app específica** ✅

## 12. Diagnóstico cuando algo falla

Mirá SIEMPRE en este orden:
1. `http://127.0.0.1:4040` (inspector de ngrok) — ¿llega el POST? ¿qué status devuelve?
2. Terminal de `pnpm dev` — el error real completo, no solo el status code
3. Tabla `messages` en Supabase (`select wamid, status, status_error from messages order by created_at desc limit 5`) — desde que agregamos el tracking, ahí queda el motivo exacto de cualquier fallo de envío

---

# PARTE B — Número real de un cliente (producción, sin este setup manual)

## Concepto: Embedded Signup

Meta tiene un flujo hecho exactamente para esto: un **popup de login de
Facebook embebido en tu propia página de onboarding**. El cliente:

1. Hace click en "Conectar WhatsApp" en tu app
2. Se abre un popup de Meta — se loguea con SU cuenta de Facebook/Business
3. Autoriza tu app a acceder a WhatsApp Business en su nombre
4. Ingresa o confirma el número de teléfono de SU negocio (tiene que ser un
   número dedicado, no el que ya usa en la app normal de WhatsApp — aunque
   si usa la app "WhatsApp Business" sí puede migrarlo, y con "Coexistence"
   hasta puede seguir usando la app al mismo tiempo)
5. El popup se cierra y le devuelve a tu página un `code` de un solo uso
6. **Tu servidor** intercambia ese `code` por un `access_token` + obtiene el
   `waba_id` y `phone_number_id` automáticamente, vía la Graph API

El cliente nunca ve Meta Developers, nunca crea una App, nunca toca ngrok
ni nada de la Parte A. Todo el peso de la configuración técnica lo absorbe
tu plataforma (una sola App de Meta, la tuya, sirve para todos los clientes).

## Lo que hay que construir (no existe todavía en el código)

1. **Botón "Conectar WhatsApp"** en `/turnos` o `/ventas` (la página de
   configuración de Meta que diseñamos en Fase 3) que carga el SDK de
   Facebook Login for Business y abre el popup de Embedded Signup
2. **Endpoint del lado del servidor** que recibe el `code` devuelto por el
   popup y lo intercambia por el `access_token` + `waba_id` + `phone_number_id`
   reales (llamada a la Graph API, similar a un OAuth callback)
3. Guardar esos 3 valores en la fila `negocio` del tenant que inició el flujo
   (mismo lugar donde hoy los cargamos a mano con el script)
4. El webhook (`/api/webhooks/whatsapp`) **no cambia nada** — ya busca el
   negocio por `phone_number_id`, así que un número real onboardeado vía
   Embedded Signup funciona exactamente igual que el de prueba, sin tocar
   esa parte del código

## Requisitos del lado de Meta (antes de poder ofrecer esto a clientes reales)

- Tu App tiene que estar en modo **Live** (no en desarrollo)
- **App Review** aprobado para los permisos `whatsapp_business_management` y
  `whatsapp_business_messaging` en modo producción
- **Business Verification** de tu Business Portfolio — sin esto, el límite
  es de solo 10 clientes nuevos cada 7 días; con la verificación completa,
  sube a 200 por semana
- Si en algún momento esperás onboardear volúmenes mayores (varios cientos
  por semana), hay que aplicar a ser **Meta Business Partner**

## Nota importante

Podés probar el flujo de Embedded Signup vos mismo con tu propia cuenta de
Facebook antes de ofrecérselo a un cliente real — pero cada prueba genera un
Business Portfolio y un WABA nuevos, así que conviene limpiarlos después
para no llenar tu cuenta de basura de prueba.

## Estado de esta parte en el proyecto

**No implementada todavía.** Es candidata a ser su propio sub-proyecto
(brainstorming + spec + plan, mismo proceso que A/B/C/D) cuando se priorice
— probablemente antes de invitar al primer cliente real a la plataforma,
ya que sin esto cada alta de cliente requeriría repetir manualmente toda la
Parte A, lo cual no escala.

---

# PARTE C — Conseguir las credenciales para Embedded Signup

**Importante primero**: `NEXT_PUBLIC_META_APP_ID` y
`NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` son **tuyas, de Matías/FactorIA
— no de cada cliente**. Una sola App de Meta (la tuya) sirve para todos los
negocios que se conecten. Cada cliente nunca crea su propia App ni pasa por
Meta Developers — solo hace login con SU cuenta de Facebook dentro del popup
que abre TU App.

## 1. NEXT_PUBLIC_META_APP_ID

Es el más simple de los dos: App Dashboard → **Configuración → Básica** →
ahí mismo, junto al App Secret, está el **App ID** (un número, no es
secreto — por eso puede ir en una variable `NEXT_PUBLIC_`, visible en el
navegador).

## 2. NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID

Este requiere armar una "Configuración de Facebook Login for Business":

1. App Dashboard → en la página principal, buscá la tarjeta **"Facebook
   Login for Business"** → "Configurar" (si no está agregado a la App,
   agregalo como producto primero, igual que hiciste con WhatsApp)
2. Menú izquierdo de ese producto → **"Configuraciones"**
3. **"Crear configuración"** → ponele un nombre (ej. "FactorIA - Onboarding
   clientes")
4. En **"Login variation"**, elegí específicamente **"WhatsApp Embedded
   Signup"** (no una configuración genérica)
5. En **"Assets"**, seleccioná **"WhatsApp accounts"** — no marques nada que
   no vayas a usar (catálogos, etc.), porque eso le agrega pasos de más al
   cliente en el popup y aumenta el abandono
6. En **"Permissions"**, marcá `whatsapp_business_management` y
   `whatsapp_business_messaging`
7. **"Crear"** → copiá el **Configuration ID** que te muestra (un número
   largo) — ese es el valor de `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID`
8. Andá a **"Configuraciones" → "Ajustes"** (Settings) de ese mismo producto
   Facebook Login → agregá tu dominio real de producción en los campos de
   OAuth/JavaScript SDK (mientras estás en local con ngrok, agregá también
   la URL de ngrok ahí)

## 3. Probar antes de someterlo a revisión

Según la documentación de Meta, el flujo de Embedded Signup funciona con
**Standard Access para la mayoría de los casos de uso** — es decir, podés
probarlo vos mismo (como admin/developer de tu propia App) **sin esperar la
aprobación de App Review**. Lo que SÍ requiere App Review es poder
onboardear clientes reales que no sean developers/admins de tu App.

## 4. App Review — cuándo y cómo pedirlo

Recién hace falta cuando quieras que **cualquier cliente externo** (no vos)
pueda completar el flujo:

1. App Dashboard → **"Revisión de la app" (App Review) → "Permisos y
   funciones"**
2. Buscá `whatsapp_business_management` → **"Solicitar acceso avanzado"**
3. Repetí con `whatsapp_business_messaging`
4. Por cada uno, Meta pide **dos cosas obligatorias**: una descripción
   escrita de cómo tu App usa ese permiso, y una **grabación de pantalla**
   mostrando el uso real (ej. grabar el popup de Embedded Signup completo,
   o el envío de un mensaje real vía tu App)
5. **"Revisión de la app" → "Solicitudes"** → completá el checklist
   (verificación de la App, configuración, preguntas de manejo de datos) →
   **"Enviar para revisión"**
6. El tiempo de respuesta típico es de **~24 horas**, aunque puede variar

## 5. Antes de pedir App Review, probablemente necesites Business Verification

Como vimos en la Parte B, sin **Business Verification** de tu Business
Portfolio el límite de onboarding es de solo 10 clientes nuevos cada 7 días
— con la verificación completa, sube a 200/semana. Se pide desde
**Configuración del negocio → Seguridad del centro → Verificación del
negocio**, y generalmente pide documentación legal de tu empresa (CUIT/CUIL,
constancia de inscripción, etc. según tu país).

## 6. Orden recomendado para no perder tiempo

1. Probá el flujo completo vos mismo primero (Standard Access, sin esperar nada)
2. En paralelo, iniciá Business Verification (puede tardar días)
3. Una vez que el flujo funciona bien en tus pruebas, recién ahí sometelo a
   App Review
4. Cuando tengas ambas cosas aprobadas, cambiá la App a modo **Live**
