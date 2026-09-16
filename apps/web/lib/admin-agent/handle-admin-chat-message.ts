import { ADMIN_TOOLS } from './admin-tools';

const FREE_MODELS = [
  'openrouter/free',
  'z-ai/glm-5.2:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
];

const ADMIN_SYSTEM_PROMPT = `Sos el asistente personal de Matías, dueño de la plataforma AgentesIA.
Tu trabajo es ayudarlo a entender cómo crece su negocio (cantidad de negocios
clientes, facturación que él cobra). NUNCA tenés acceso a las ventas o datos
internos de los negocios que usan la plataforma — eso es privado de cada uno.
Respondé en español, breve y directo.`;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
}

interface Deps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callOpenRouter: (params: any) => Promise<{ message: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executeAdminToolCall: (name: string, args: Record<string, unknown>, ctx: any) => Promise<any>;
}

export async function handleAdminChatMessage(
  text: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  deps: Deps
): Promise<{ responseText: string }> {
  const messages: ChatMessage[] = [
    { role: 'system', content: ADMIN_SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: text },
  ];

  let { message } = await deps.callOpenRouter({
    models: FREE_MODELS,
    messages,
    tools: ADMIN_TOOLS,
  });

  if (message.tool_calls?.length) {
    const toolCall = message.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments || '{}');

    const toolResult = await deps.executeAdminToolCall(toolCall.function.name, args, {});

    const followUp = await deps.callOpenRouter({
      models: FREE_MODELS,
      messages: [
        ...messages,
        message,
        { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(toolResult) },
      ],
      tools: ADMIN_TOOLS,
    });

    return { responseText: followUp.message.content };
  }

  return { responseText: message.content };
}
