import type { ToolDefinition } from './tools';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  // null es válido (y habitual) en un mensaje del asistente que solo pide herramientas
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; type?: 'function'; function: { name: string; arguments: string } }>;
}

interface CallOpenRouterParams {
  model?: string;
  models?: string[];
  messages: ChatMessage[];
  tools: ToolDefinition[];
}

interface OpenRouterResult {
  message: ChatMessage;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_ATTEMPTS_PER_MODEL = 3;

/**
 * Error de OpenRouter que distingue el caso "se agotó el cupo" del resto.
 *
 * Importa porque el tratamiento es distinto: un 500 es transitorio y conviene
 * reintentar, pero un 429 significa que no hay más requests disponibles hoy —
 * reintentar solo gasta tiempo y deja al cliente esperando.
 */
export class OpenRouterLimitError extends Error {
  esLimiteAgotado: boolean;

  constructor(message: string, esLimiteAgotado: boolean) {
    super(message);
    this.name = 'OpenRouterLimitError';
    this.esLimiteAgotado = esLimiteAgotado;
  }
}

// 429 = sin cupo (rate limit / límite diario de modelos gratuitos)
// 402 = sin crédito
// Ninguno de los dos se resuelve reintentando en milisegundos.
function esErrorDeCupo(status: number): boolean {
  return status === 429 || status === 402;
}

async function attemptModel(
  model: string,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  maxAttempts: number
): Promise<OpenRouterResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          ...(tools.length > 0 ? { tools } : {}),
        }),
      });

      if (!response.ok) {
        const deCupo = esErrorDeCupo(response.status);
        lastError = new OpenRouterLimitError(
          `OpenRouter respondió ${response.status} (${model})`,
          deCupo
        );
        // Sin cupo no tiene sentido reintentar el mismo modelo: el límite no
        // se libera en milisegundos. Salimos ya para pasar al siguiente.
        if (deCupo) break;
        continue;
      }

      const json = await response.json();
      return { message: json.choices[0].message };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new OpenRouterLimitError(`No se pudo obtener respuesta de OpenRouter (${model})`, false);
}

export async function callOpenRouter({
  model,
  models,
  messages,
  tools,
}: CallOpenRouterParams): Promise<OpenRouterResult> {
  // Lista de modelos con fallback (ej. rotar entre modelos gratuitos cuando
  // uno se queda sin cupo). Cada modelo se prueba UNA vez antes de pasar al
  // siguiente — el retry de MAX_ATTEMPTS_PER_MODEL solo aplica cuando se pasa
  // un único `model` (comportamiento histórico, sin cambios).
  if (models && models.length > 0) {
    let lastError: unknown;
    let todosPorCupo = true;

    for (const m of models) {
      try {
        return await attemptModel(m, messages, tools, 1);
      } catch (err) {
        lastError = err;
        if (!(err instanceof OpenRouterLimitError && err.esLimiteAgotado)) {
          todosPorCupo = false;
        }
      }
    }

    // Si todos los modelos rebotaron por falta de cupo, marcamos el error como
    // "límite agotado" para que quien llame pueda avisar con un mensaje claro
    // en vez de dejar al cliente sin respuesta.
    throw new OpenRouterLimitError(
      todosPorCupo
        ? 'Se agotó el límite diario de consultas a los modelos gratuitos'
        : `No se pudo obtener respuesta de ningún modelo (${lastError instanceof Error ? lastError.message : 'error desconocido'})`,
      todosPorCupo
    );
  }

  return attemptModel(model!, messages, tools, MAX_ATTEMPTS_PER_MODEL);
}
