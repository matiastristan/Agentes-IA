import type { ToolDefinition } from './tools';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
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
        lastError = new Error(`OpenRouter respondió ${response.status}`);
        continue;
      }

      const json = await response.json();
      return { message: json.choices[0].message };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`No se pudo obtener respuesta de OpenRouter (${model})`);
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
    for (const m of models) {
      try {
        return await attemptModel(m, messages, tools, 1);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('No se pudo obtener respuesta de ningún modelo de la lista');
  }

  return attemptModel(model!, messages, tools, MAX_ATTEMPTS_PER_MODEL);
}
