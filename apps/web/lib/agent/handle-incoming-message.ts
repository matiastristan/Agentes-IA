import { buildSystemPrompt } from './system-prompt';
import { getFechaArgentina } from './get-fecha-argentina';
import { OpenRouterLimitError } from './openrouter-client';
import { getToolsForTier } from './tools';
import { categorizeTemperatura } from './categorize-temperature';
import { shouldTriggerLeadAlert } from '../notifications/should-trigger-lead-alert';

interface NegocioLookup {
  tenant_id: string;
  nombre: string;
  tono_voz: string | null;
  horarios: Record<string, string>;
  catalogo: Array<{ nombre: string; precio: number }>;
  tier: 'base' | 'pro';
  phone_number_id: string;
  access_token: string | null;
  estado_cuenta?: string;
  email_alertas?: string | null;
  instruccionesAdicionales?: string | null;
  recursos?: Array<{ nombre: string; subtipo: string | null }>;
}

interface IncomingMessage {
  phoneNumberId: string;
  from: string;
  text: string;
}

interface Deps {
  findNegocioByPhoneNumberId: (phoneNumberId: string) => Promise<NegocioLookup | null>;
  findOrCreateConversation: (
    tenantId: string,
    phoneFrom: string
  ) => Promise<{ id: string; bot_desactivado?: boolean }>;
  isClienteBloqueado: (tenantId: string, phone: string) => Promise<boolean>;
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
    wamid?: string;
    status?: 'sent' | 'failed';
    statusError?: string;
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
  }) => Promise<{ success: boolean; error?: string; wamid?: string }>;
  isAlertaLeadCalienteHabilitada: (tenantId: string) => Promise<boolean>;
  updateConversationTemperatura: (conversationId: string, temperatura: string) => Promise<void>;
  sendLeadAlertEmail: (params: {
    to: string;
    nombreNegocio: string;
    customerName: string;
    customerPhone: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

// Modelos gratuitos de OpenRouter, con fallback en orden: si el primero se
// queda sin cupo (402/429), se prueba el siguiente automáticamente.
// Modelos gratuitos, en orden de preferencia. Si uno falla o está saturado se
// pasa automáticamente al siguiente.
//
// OJO: tener más modelos NO da más cupo diario. El límite de requests a modelos
// gratuitos que aplica OpenRouter es por CUENTA, no por modelo, así que esta
// lista sirve para resistir caídas puntuales de un proveedor, no para estirar
// el cupo. Para eso hay que pasar a modelos pagos.
export const FREE_MODELS = [
  'openrouter/free',
  'z-ai/glm-5.2:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
];

// Envía la respuesta por WhatsApp y guarda el mensaje del asistente con el
// resultado real del envío (wamid si funcionó, status/statusError si falló).
// Compartido entre la rama con tool-call y la rama de respuesta directa para
// no duplicar esta lógica.
async function sendAndSaveAssistantMessage(
  negocio: NegocioLookup,
  conversationId: string,
  content: string,
  incoming: IncomingMessage,
  deps: Deps,
  toolCalled?: string
): Promise<string | undefined> {
  let sendError: string | undefined;
  let wamid: string | undefined;
  let status: 'sent' | 'failed' = 'sent';

  if (negocio.access_token) {
    const sendResult = await deps.sendWhatsAppMessage({
      phoneNumberId: negocio.phone_number_id,
      accessToken: negocio.access_token,
      to: incoming.from,
      text: content,
    });

    if (sendResult.success) {
      wamid = sendResult.wamid;
    } else {
      status = 'failed';
      sendError = sendResult.error;
      console.error('No se pudo enviar la respuesta por WhatsApp:', sendResult.error);
    }
  }

  await deps.saveMessage({
    tenantId: negocio.tenant_id,
    conversationId,
    role: 'assistant',
    content,
    toolCalled,
    wamid,
    status,
    statusError: sendError,
  });

  return sendError;
}

export async function handleIncomingMessage(
  incoming: IncomingMessage,
  deps: Deps
): Promise<{ handled: boolean; responseText?: string; sendError?: string }> {
  const negocio = await deps.findNegocioByPhoneNumberId(incoming.phoneNumberId);

  if (!negocio) {
    return { handled: false };
  }

  if (negocio.estado_cuenta && negocio.estado_cuenta !== 'activo') {
    return { handled: false };
  }

  const bloqueado = await deps.isClienteBloqueado(negocio.tenant_id, incoming.from);
  if (bloqueado) {
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

  // Calificación automática de lead — upsell activable por negocio desde el
  // panel admin. Corre independiente de si el bot está desactivado en esta
  // conversación puntual, porque el dueño quiere saber de un lead caliente
  // incluso si un vendedor humano ya tomó la charla.
  const alertasHabilitadas = await deps.isAlertaLeadCalienteHabilitada(negocio.tenant_id);
  if (alertasHabilitadas) {
    const cantidadMensajesUsuario =
      history.filter((m) => m.role === 'user').length + 1; // +1 por el mensaje actual

    const temperatura = await categorizeTemperatura(
      [...history, { role: 'user' as const, content: incoming.text }],
      deps.callOpenRouter
    );

    await deps.updateConversationTemperatura(conversation.id, temperatura);

    if (
      shouldTriggerLeadAlert({ temperatura, cantidadMensajesUsuario, featureHabilitada: true }) &&
      negocio.email_alertas
    ) {
      await deps.sendLeadAlertEmail({
        to: negocio.email_alertas,
        nombreNegocio: negocio.nombre,
        customerName: incoming.from,
        customerPhone: incoming.from,
      });
    }
  }

  if (conversation.bot_desactivado) {
    return { handled: false };
  }

  const systemPrompt = buildSystemPrompt(negocio, getFechaArgentina());
  const tools = getToolsForTier(negocio.tier);

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history,
    { role: 'user' as const, content: incoming.text },
  ];

  let message;
  try {
    ({ message } = await deps.callOpenRouter({ models: FREE_MODELS, messages, tools }));
  } catch (err) {
    // Si el modelo no pudo responder (cupo agotado, red caída, etc.) el cliente
    // NO puede quedar sin respuesta: eso es lo peor que puede pasar en WhatsApp.
    // Le mandamos un mensaje humano, sin detalles técnicos.
    const esCupo = err instanceof OpenRouterLimitError && err.esLimiteAgotado;
    const aviso = esCupo
      ? 'Perdón, en este momento no puedo responderte automáticamente. Ya le avisé al equipo y te contestan a la brevedad. 🙏'
      : 'Perdón, tuve un problema técnico para responderte. Ya le avisé al equipo y te contestan a la brevedad. 🙏';

    const sendError = await sendAndSaveAssistantMessage(
      negocio,
      conversation.id,
      aviso,
      incoming,
      deps
    );

    return { handled: true, responseText: aviso, sendError };
  }

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
      models: FREE_MODELS,
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

    const sendError = await sendAndSaveAssistantMessage(
      negocio,
      conversation.id,
      followUp.message.content,
      incoming,
      deps,
      toolCall.function.name
    );

    return { handled: true, responseText: followUp.message.content, sendError };
  }

  const sendError = await sendAndSaveAssistantMessage(
    negocio,
    conversation.id,
    message.content,
    incoming,
    deps
  );

  return { handled: true, responseText: message.content, sendError };
}
