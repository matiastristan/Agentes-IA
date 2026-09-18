# Alta de un cliente nuevo — número real (flujo manual definitivo)

Este es el proceso que usás de acá en adelante para cada cliente nuevo. No
usa Embedded Signup ni login con Facebook del cliente — vos manejás toda la
configuración de Meta con tu propia cuenta de developer, y el cliente solo
recibe un usuario y contraseña para entrar a su panel.

## Antes de empezar — lo que NO hay que repetir

Todo esto ya está hecho **una sola vez**, a nivel de tu App entera, y sirve
para todos los clientes sin volver a tocarlo:

- ✅ App de Meta creada (Agentes Test)
- ✅ App suscripta al WABA (`subscribed_apps`)
- ✅ System User Token generado (con `whatsapp_business_management` +
  `whatsapp_business_messaging`, sin vencimiento)
- ✅ Webhook configurado a nivel App

Todos los números de teléfono de tus clientes van a vivir en la **misma
WABA** — así el token que ya tenés generado sirve para todos, sin generar
uno nuevo por cliente.

### ¿Cuál es "la" WABA única?

La misma que ya tenés desde el primer día — la que contiene el número de
prueba de la Barbería. Para confirmar su ID: business.facebook.com →
"WhatsApp Manager" → click en la cuenta → el "Identificador" que muestra
es el WABA ID.

**Dato técnico importante**: la restricción de "número de prueba" (que
solo puede escribirle a destinatarios pre-aprobados) es una limitación del
**número en sí**, no de la cuenta completa. Un número real nuevo que
agregues a esa misma WABA funciona en modo producción completo desde el
primer momento, sin heredar esa restricción.

## ¿El número del cliente tiene que ser "de WhatsApp Business"?

No — puede ser un número completamente nuevo, nunca usado en WhatsApp.

- Un número **nuevo** (nunca usado en WhatsApp): se registra directo, sin problema
- Un número que **ya está activo en la app normal** de WhatsApp (la de
  consumidor): hay que darlo de baja ahí primero antes de poder
  registrarlo en la API
- Un número que **ya está en la app de WhatsApp Business** (la gratis
  para pymes): se puede registrar directo, o usar Coexistence (ver abajo)

### ¿Qué pasa con las llamadas, SMS, y la app normal una vez registrado?

- **Llamadas telefónicas y SMS**: siguen funcionando exactamente igual,
  siempre — es un sistema totalmente aparte de WhatsApp, la línea no se
  toca
- **La app de WhatsApp (normal o Business) en el celular**: por default,
  se desloguea del todo — no se puede volver a usar esa app manualmente
  con ese número, no hay estados, no hay chat manual vía app
- **Recomendación para clientes nuevos**: usar una línea dedicada que no
  necesiten para nada personal — evita toda la complejidad de abajo

### Alternativa — Coexistence (opcional, más complejo)

Si el cliente insiste en seguir chateando manualmente desde su celular
además de que el agente responda automático:
- Solo funciona si el número viene de la app de **WhatsApp Business**
  (la gratuita) — no desde la app normal de consumidor
- El cliente sigue pudiendo usar la app de WhatsApp Business en su
  celular, Y ADEMÁS tu agente responde vía API — el historial se
  sincroniza entre ambos
- Requiere versión 2.24.17+ de la app del cliente
- No lo necesitamos para el flujo estándar — es una opción a futuro si
  algún cliente puntual lo pide

## Paso 0 (una sola vez, antes del primer cliente real) — Actualizar el Webhook a producción

Ahora mismo tu webhook probablemente sigue apuntando a la URL vieja de
ngrok (que ya no está corriendo). Antes de dar de alta al primer cliente
real, actualizalo:

1. Meta → tu App → ícono de lápiz (Casos de uso) → Personalizar
   (Conectar en WhatsApp) → **Configuración**
2. Campo **"URL de devolución de llamada"** → cambialo a:
   ```
   https://factor-ia-coral.vercel.app/api/webhooks/whatsapp
   ```
3. **"Identificador de verificación"** → tiene que coincidir con tu
   `META_VERIFY_TOKEN` (el mismo valor que ya está cargado en Vercel — no
   hace falta cambiarlo, solo confirmar que sea el mismo)
4. **"Verificar y guardar"**

Sin este paso, ningún mensaje de WhatsApp real va a llegar a tu app en
producción — se van a perder en el vacío (o seguir yendo a tu ngrok
apagado).

## Paso 1 — Conseguir los datos del cliente

Para cada cliente nuevo, necesitás que te pase:
- Nombre del negocio (ej. "Canchas El Golazo")
- Un número de teléfono **dedicado** para WhatsApp Business — idealmente
  uno que **nunca estuvo activo** en la app normal de WhatsApp (evita
  complicaciones). Si ya usa la app de WhatsApp Business (la gratuita), se
  puede registrar igual, pero avisale que va a tener que dar de baja ese
  número de esa app primero
- Email de contacto (para su usuario de acceso al panel)

## Paso 2 — Registrar el número nuevo en Meta

1. Meta → tu App → **WhatsApp → Configuración de la API** (o "Números de
   teléfono" en el menú, según la sección)
2. Buscá el botón **"Agregar número de teléfono"** / "Add phone number"
3. Completá:
   - **Nombre visible** (Display Name): el nombre del negocio tal como lo
     va a ver el cliente final en WhatsApp — Meta lo revisa y puede
     tardar un poco en aprobarlo, elegilo bien la primera vez
   - **Número de teléfono**: el que te pasó el cliente
   - **Categoría del negocio** y **descripción**: completá lo que
     corresponda (deporte/entretenimiento para las canchas)
4. Meta manda un código de verificación (SMS o llamada) al número del
   cliente — vas a necesitar que te lo pase, o hacerlo en videollamada/
   compartiendo pantalla con él
5. Confirmá el código → el número queda registrado en la Cloud API

## Paso 3 — Copiar el Phone Number ID nuevo

1. En la lista de números de tu WABA, buscá el que acabás de agregar
2. Copiá su **Phone Number ID** (es distinto para cada número — no es el
   mismo que el de la Barbería)

## Paso 4 — Dar de alta el negocio en tu plataforma

1. `https://factor-ia-coral.vercel.app/admin/negocios/nuevo`
2. Completá:
   - Nombre del negocio
   - Email del cliente
   - Tipo de negocio: **Turnos y citas** (para ambas canchas)
   - Rubro: `cancha_futbol` o `cancha_padel` según corresponda
   - **Phone Number ID**: el que copiaste en el Paso 3
   - **Access Token**: el mismo System User Token que ya usás para la
     Barbería — **no hace falta generar uno nuevo**, porque está a nivel
     de la WABA completa, no por número
3. "Crear negocio" → te muestra el email y la contraseña temporal
4. Copiá esas credenciales y pasáselas al cliente (por WhatsApp, email,
   como prefieras)

## Paso 5 — Probar

Mandale un WhatsApp al número nuevo del cliente (desde tu celular
personal) y confirmá que el agente responde correctamente, usando el
tono/catálogo/horarios que ese negocio en particular tenga cargado.

## Repetir para cada cliente nuevo

Del Paso 1 al 5, cada vez. El Paso 0 es una sola vez para siempre (ya
hecho una vez que lo completes ahora).

## Límite a tener en cuenta (no aplica todavía)

Sin Business Verification completa, Meta limita a 10 negocios nuevos cada
7 días en total (sumando todos los clientes, no por WABA). Con 2 clientes
nuevos no hay ningún problema — es solo algo para tener en el radar si en
algún momento el ritmo de altas crece mucho.
