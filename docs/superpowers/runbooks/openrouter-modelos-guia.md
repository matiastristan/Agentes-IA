# Configuración de OpenRouter — Modelos Gratuitos y de Pago

## 1. Conseguir la API Key

1. https://openrouter.ai → creá una cuenta (podés usar Google/GitHub)
2. https://openrouter.ai/keys → **"Create Key"** → ponele un nombre (ej.
   "FactorIA producción") → copiala
3. Guardala en tu `.env.local` (y en Vercel, como variable **Secret**, no Config):
   ```
   OPENROUTER_API_KEY=sk-or-v1-...
   ```

No hace falta cargar saldo para usar los modelos gratuitos — solo si querés
habilitar los de pago (ver punto 4).

## 2. Cómo está armado el sistema de modelos en el código

Hay **dos** listas de modelos gratuitos independientes, una para el agente
de cada negocio y otra para tu agente personal de admin:

| Archivo | Para qué es |
|---|---|
| `lib/agent/handle-incoming-message.ts` (`FREE_MODELS`) | El agente que responde a los clientes de cada negocio por WhatsApp |
| `lib/admin-agent/handle-admin-chat-message.ts` (`FREE_MODELS`) | Tu agente personal en el panel admin (`/admin/chat`) |

Cada llamada a `callOpenRouter` recibe un array `models: [...]` — la función
(`lib/agent/openrouter-client.ts`) prueba el primero, y si OpenRouter
responde 402 (sin crédito/cupo) o 429 (rate limit), prueba automáticamente
el siguiente de la lista, sin que el usuario note nada.

## 3. Los modelos gratuitos actuales

```ts
const FREE_MODELS = [
  'openrouter/free',                  // router que elige el mejor modelo gratis disponible
  'z-ai/glm-5.2:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
];
```

- `openrouter/free` **no es un slug inventado** — es un router oficial de
  OpenRouter que elige entre varios modelos gratuitos por vos, y soporta
  tool-calling (imprescindible para que el agente pueda usar las tools de
  turnos/ventas)
- Los modelos `:free` tienen límites de uso diario/por minuto más bajos que
  los de pago — por eso el fallback a varios en cadena importa: si uno se
  queda sin cupo en un momento de mucho tráfico, sigue funcionando con el
  siguiente

### Actualizar la lista de modelos gratuitos

Los modelos gratuitos disponibles cambian con el tiempo (OpenRouter agrega
y saca proveedores). Para ver el catálogo actual:

https://openrouter.ai/models?max_price=0

Y para editarlos, es una sola línea por archivo:

```powershell
# Ejemplo: agregar un modelo nuevo a la lista del agente de negocios
```
Editá directamente el array `FREE_MODELS` en los dos archivos de la tabla
de arriba, agregando el slug del modelo nuevo (tal cual aparece en la URL
de OpenRouter, ej. `nombre-proveedor/nombre-modelo:free`).

## 4. Pasar a modelos de pago (cuando quieras mejor calidad)

### Cuándo conviene
Los modelos gratuitos son buenos para arrancar, pero tienen menor calidad
de razonamiento y límites de uso más estrictos. Cuando tengas clientes
reales pagando, vale la pena evaluar el salto a modelos pagos — mejor
comprensión de instrucciones complejas, menos alucinaciones.

### Paso a paso

1. **Cargar saldo**: https://openrouter.ai/credits → "Add credits" → tarjeta
   o cripto. Empezá con poco (ej. USD 10) para probar el consumo real antes
   de comprometer más
2. **Elegir el modelo**: los que ya probamos y funcionan bien con este
   proyecto son:
   - `anthropic/claude-haiku-4.5` — rápido y barato, buena relación
     costo/calidad para el tier "base"
   - `anthropic/claude-sonnet-4.5` — mejor calidad, más caro, para el tier
     "pro"/"premium"
   (Ver precios actualizados en https://openrouter.ai/models antes de decidir
   — cambian con el tiempo)
3. **Editar el código**: en vez de una sola lista `FREE_MODELS` para todos,
   armá la selección según el `tier` del negocio (esto es un cambio de
   código, no solo de config — avisame cuando quieras hacerlo y lo armamos
   juntos con tests, seria un buen sub-proyecto chico)

### Diseño sugerido (para cuando lo implementemos)

```ts
const MODELS_POR_TIER = {
  base: ['anthropic/claude-haiku-4.5', ...FREE_MODELS],   // fallback a gratis si se corta el saldo
  pro: ['anthropic/claude-sonnet-4.5', 'anthropic/claude-haiku-4.5', ...FREE_MODELS],
  premium: ['anthropic/claude-sonnet-4.5', ...FREE_MODELS],
};
```
La idea: modelo pago primero (mejor calidad), con los gratuitos como red de
seguridad si en algún momento se corta el saldo — así el agente nunca deja
de responder por completo.

## 5. Monitorear consumo y costos

https://openrouter.ai/activity — ves cada llamada, qué modelo la atendió,
cuánto costó. Útil para:
- Detectar qué negocio/conversación está generando más consumo
- Confirmar que el fallback a modelos gratuitos está funcionando cuando
  corresponde (deberías ver una mezcla de modelos en el activity log, no
  siempre el mismo)
- Poner una alerta de gasto: https://openrouter.ai/settings/limits → definí
  un límite mensual para que corte antes de gastar de más por error

## 6. Nota de seguridad

La `OPENROUTER_API_KEY` es una key real con acceso a gastar tu saldo — nunca
la pegues en el chat con Claude, ni la subas a git. Vive únicamente en tu
`.env.local` (nunca commiteado, está en `.gitignore`) y como variable
**Secret** en Vercel.
