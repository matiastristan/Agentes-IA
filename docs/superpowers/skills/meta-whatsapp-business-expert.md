# Meta / WhatsApp Business Platform — Skill de Referencia (2026)

Investigación consolidada de la documentación oficial de Meta for Developers
+ fuentes de la industria, vigente a septiembre 2026. Para desarrollo
full-stack de una plataforma SaaS multi-tenant como FactorIA.

## 1. Estado actual de la plataforma (lo que cambió recientemente)

- **La API On-Premises fue discontinuada oficialmente en octubre de 2025**
  — la Cloud API es la única arquitectura soportada. No hay alternativa
  "self-hosted" vigente.
- **Modelo de cuenta compartida ("Shared Account Model")**: el viejo
  modelo "On-Behalf-Of" (donde la plataforma era dueña de la WABA del
  cliente) ya no existe. Ahora **el cliente es dueño de su propia WABA**
  y la comparte con tu App via Embedded Signup — exactamente el patrón que
  ya implementamos.
- **Embedded Signup v2 se discontinúa el 15 de octubre de 2026** — hay que
  migrar a v4 antes de esa fecha (nuestra implementación ya usa la versión
  actual del SDK, revisar antes de esa fecha igual).
- **Precios**: desde julio de 2025, Meta cobra **por mensaje de plantilla
  entregado**, ya no por "conversación" de 24hs. Los mensajes dentro de la
  ventana de servicio de 24hs siguen siendo gratis. Los primeros 1000
  mensajes de servicio por mes siguen siendo gratis.
- **Evolución del modelo de cuentas (2026, en fases)**: Embedded Signup
  ahora crea automáticamente una "Messaging Account" separada por cada
  partner/plataforma que se conecta a la WABA de un cliente — no cambia
  nuestra arquitectura, es transparente para nosotros.

## 2. Los dos roles posibles frente a Meta (y por qué elegimos uno)

| | Solution Partner | Tech Provider (el nuestro) |
|---|---|---|
| Puede facturar directamente el uso de API a sus clientes | Sí | No |
| Acceso a línea de crédito de Meta | Sí | No |
| Proceso de aprobación | Largo | Más simple |
| Puede ofrecer el rango completo de servicios de WhatsApp Business Platform | Sí | Sí |

**Tech Provider es la elección correcta para FactorIA**: no necesitamos
facturar el uso de API directamente a través de Meta (facturamos nosotros
nuestro propio servicio SaaS por fuera), y el proceso es más simple. Esto
ya está elegido correctamente en nuestra configuración ("Independent Tech
Provider").

## 3. Requisitos confirmados para que el modelo funcione en producción

De la documentación oficial de "Onboarding WhatsApp Business app users":
- Ya tenés que ser Solution Partner **o** Tech Provider (confirmado: nuestro caso)
- Tenés que saber usar la Cloud API (ya implementado)
- Tu webhook tiene que poder recibir y procesar webhooks correctamente (ya implementado)

De "WhatsApp Business Platform — Permissions":
- **"Si sos developer directo y solo accedés a tus propios datos de
  negocio, NO necesitás pasar por App Review ni Advanced Access para
  ningún permiso."** — esto es clave: probar con tu propia cuenta como
  admin de la App debería funcionar sin esperar aprobación
- **"Si tu App usa el permiso `whatsapp_business_management` para acceder
  a WABAs que NO son tuyas, necesitás Advanced Access para ese permiso.
  Sin eso, las llamadas a la API devuelven código de error 200."** — esto
  es lo que se activa recién cuando un CLIENTE REAL (no vos) completa el
  flujo
- Mientras la App está en modo Development, los permisos aparecen en la
  pantalla de autorización de Embedded Signup a cualquiera con rol admin,
  developer o tester en la App. **Una vez que pasás la App a modo Live,
  solo aparecen los permisos aprobados por Advanced Access.**

## 4. Requisitos del número de teléfono del cliente

De "WhatsApp Business Platform — Client phone numbers":
- **El cliente necesita un número dedicado.** Un número que ya está activo
  en la app normal de WhatsApp (la de consumidor) **no es soportado** — hay
  que darlo de baja primero
- Un número que ya está en uso con la **app de WhatsApp Business** (la
  gratuita, para pymes) **sí se puede registrar** en la Cloud API — ese es
  el escenario de "Coexistence" (ver abajo)
- Un cliente puede tener varios números asociados a su cuenta de negocio —
  puede agregar un número nuevo específico para la API si prefiere no tocar
  el que ya usa
- **Recomendación oficial de Meta**: desalentar fuertemente el uso de un
  número de prueba o personal para el registro real — es difícil de
  cambiar después

### Coexistence (útil para nuestros clientes)

Permite que el cliente conecte su cuenta **existente** de la app de
WhatsApp Business (no necesita un número nuevo) — sigue pudiendo mandar
mensajes uno-a-uno desde su celular con la app normal, mientras tu
plataforma (FactorIA) maneja el volumen alto y la automatización via API.
El historial de mensajes se mantiene sincronizado entre ambos. Requiere
versión 2.24.17+ de la app de WhatsApp Business del cliente.

## 5. Respuestas a las 3 preguntas estratégicas de Matías

### ¿Creo una App de Meta nueva por cada cliente?

**No — y es importante corregir esto.** El modelo que Meta diseñó
específicamente para este caso de uso (una plataforma SaaS con muchos
clientes) es **una sola App tuya** (la que ya tenemos, con Embedded Signup
configurado), donde **cada cliente conecta su propia WABA a esa misma App**
a través del popup de login. Nunca creás una App nueva por cliente — eso
sería repetir manualmente todo lo que hicimos hoy (App ID, Config ID,
webhooks) para cada negocio nuevo, exactamente lo que Embedded Signup existe
para evitar.

### ¿Necesita cada cliente su propia cuenta de developers?

**No.** El cliente solo necesita una cuenta normal de Facebook/Meta (la
misma con la que ya administra su Página de Facebook o su Instagram, si
pauta ahí) — **no necesita registrarse como developer en absoluto**. El
popup de Embedded Signup usa su login normal de Facebook, no requiere que
sea developer de nada. Si ya pauta en Facebook/Instagram, eso significa que
ya tiene un Business Portfolio (Business Manager) — lo cual **acelera** el
proceso porque parte de la información ya está pre-cargada, pero no es un
requisito, alguien sin experiencia previa en Meta Ads también puede
completar el flujo desde cero.

### ¿Hace falta "WhatsApp Business" específicamente, o sirve un número normal?

**Depende del estado actual del número del cliente:**
- Si el número **nunca estuvo activo en WhatsApp** (ni la app normal ni la
  de Business): se puede registrar directo en la Cloud API sin problema
- Si el número **está activo en la app normal de WhatsApp** (de
  consumidor): hay que darlo de baja ahí primero antes de poder usarlo en
  la API
- Si el número **ya está en la app de WhatsApp Business** (la gratuita para
  pymes): se puede registrar directo, o mejor todavía, usar **Coexistence**
  para que el cliente no pierda lo que ya tenía
- La recomendación general, sobre todo para negocios que recién arrancan
  con FactorIA, es que usen un número dedicado nuevo si pueden — evita
  fricción y es más fácil de cambiar el nombre de display más adelante si
  hace falta

**No hace falta que el negocio ya tenga experiencia previa con WhatsApp
Business** — el número puede ser completamente nuevo, y todo el proceso de
convertirlo en un número de la Cloud API pasa dentro del flujo de Embedded
Signup mismo, sin que el cliente tenga que ir a configurar nada aparte.

## 6. Nota sobre el error que encontramos hoy ("supported permission")

Según la documentación, en modo Development, cualquier admin/developer/
tester de la App debería ver los permisos correctamente sin necesitar App
Review. Que Matías (admin de la App) haya recibido este error sugiere que
el problema puede estar en un nivel distinto al que exploramos — posibles
causas a revisar en la próxima sesión de debugging, además de la
Verificación de Empresa pendiente:
- Confirmar en **App Review → Permisos y funciones** que
  `whatsapp_business_management` y `whatsapp_business_messaging` aparezcan
  ahí como "agregados" a la App (a veces hace falta un paso de "Solicitar"
  incluso en modo Standard/Development, sin llegar a enviar para revisión)
- Confirmar que la App está efectivamente en modo **Development**, no Live
  sin aprobación

## 7. Alternativa que existe en el mercado (no recomendada para ahora)

Empresas como 360dialog, Wati, Twilio y Chakra ofrecen ser "Business
Solution Provider" (BSP) — un intermediario pago que simplifica el
onboarding a cambio de una comisión/suscripción. Argumentan que "integrar
directo es demasiado complejo para SaaS multi-tenant". **Esto es parcialmente
marketing de su propio producto** — el programa oficial de Tech Provider de
Meta está diseñado exactamente para que un SaaS como FactorIA lo haga
directo, sin necesitar un BSP intermediario. Vale la pena tenerlo en mente
como opción de respaldo si en algún momento el volumen de clientes hace que
la complejidad operativa (aprobar templates, manejar rate limits, soporte)
supere lo que Matías puede sostener solo — pero no es necesario ahora.
