import { buildSystemPrompt } from './system-prompt';
import { getToolsForTier } from './tools';

interface NegocioLookup {
  tenant_id: string;
  nombre: string;
  tono_voz: string | null;
  horarios: Record<string, string>;
  catalogo: Array<{ nombre: string; precio: number }>;
  tier: 'base' | 'pro';
  phone_number_id: string;
  access_token: string | null;
}

interface IncomingMessage {
  phoneNumberId: string;
  from: string;
  text: string;
}

interface Deps {
  findNegocioByPhoneNumberId: (phoneNumberId: string) => Promise<NegocioLookup | null>;
  findOrCreateConversation: (tenantId: string, phoneFrom: string) => Promise<{ id: string }>;
  loadRecentMessages: (
    tenantId: string,
    phoneFrom: string
  ) => Promise<Array<{ role: 'user' | 'assistant'; content: string }>>;
  saveMessage: (msg: {
    tenantId: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    toolCalled?: string;
  }) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callOpenRouter: (params: any) => Promise<{ message: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executeToolCall: (name: string, args: Record<string, unknown>, ctx: any) => Promise<any>;
  sendWhatsAppMessage: (params: {
    phoneNumberId: string;
    accessToken: string;
    to: string;
    text: string;
  }) => Promise<{ success: boolean }>;
}

const MODEL_BY_TIER: Record<'base' | 'pro', string> = {
  base: 'anthropic/claude-3.5-haiku',
  pro: 'anthropic/claude-3.5-sonnet',
};

export async function handleIncomingMessage(
  incoming: IncomingMessage,
  deps: Deps
): Promise<{ handled: boolean; responseText?: string }> {
  const negocio = await deps.findNegocioByPhoneNumberId(incoming.phoneNumberId);

  if (!negocio) {
    return { handled: false };
  }

  const conversation = await deps.findOrCreateConversation(negocio.tenant_id, incoming.from);
  const history = await deps.loadRecentMessages(negocio.tenant_id, incoming.from);

  await deps.saveMessage({
    tenantId: negocio.tenant_id,
    conversationId: conversation.id,
    role: 'user',
    content: incoming.text,
  });

  const systemPrompt = buildSystemPrompt(negocio);
  const tools = getToolsForTier(negocio.tier);
  const model = MODEL_BY_TIER[negocio.tier];

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history,
    { role: 'user' as const, content: incoming.text },
  ];

  let { message } = await deps.callOpenRouter({ model, messages, tools });

  // Si el modelo pidió usar una tool, la ejecutamos y le devolvemos el resultado
  // para que genere la respuesta final en texto (segundo round-trip).
  if (message.tool_calls?.length) {
    const toolCall = message.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments || '{}');

    const toolResult = await deps.executeToolCall(toolCall.function.name, args, {
      tenantId: negocio.tenant_id,
      tier: negocio.tier,
      phone: incoming.from,
    });

    const followUp = await deps.callOpenRouter({
      model,
      messages: [
        ...messages,
        message,
        {
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        },
      ],
      tools,
    });

    await deps.saveMessage({
      tenantId: negocio.tenant_id,
      conversationId: conversation.id,
      role: 'assistant',
      content: followUp.message.content,
      toolCalled: toolCall.function.name,
    });

    if (negocio.access_token) {
      await deps.sendWhatsAppMessage({
        phoneNumberId: negocio.phone_number_id,
        accessToken: negocio.access_token,
        to: incoming.from,
        text: followUp.message.content,
      });
    }

    return { handled: true, responseText: followUp.message.content };
  }

  await deps.saveMessage({
    tenantId: negocio.tenant_id,
    conversationId: conversation.id,
    role: 'assistant',
    content: message.content,
  });

  if (negocio.access_token) {
    await deps.sendWhatsAppMessage({
      phoneNumberId: negocio.phone_number_id,
      accessToken: negocio.access_token,
      to: incoming.from,
      text: message.content,
    });
  }

  return { handled: true, responseText: message.content };
}
