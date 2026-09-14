import type { ToolDefinition } from './tools';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
}

interface CallOpenRouterParams {
  model: string;
  messages: ChatMessage[];
  tools: ToolDefinition[];
}

interface OpenRouterResult {
  message: ChatMessage;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_ATTEMPTS = 3;

export async function callOpenRouter({
  model,
  messages,
  tools,
}: CallOpenRouterParams): Promise<OpenRouterResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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

  throw lastError instanceof Error
    ? lastError
    : new Error('No se pudo obtener respuesta de OpenRouter tras 3 intentos');
}
