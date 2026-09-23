import { buildSystemPrompt } from './system-prompt';
import { getFechaArgentina } from './get-fecha-argentina';
import { OpenRouterLimitError } from './openrouter-client';
import { textoConfirmacionReserva, type ReservaConfirmada } from './texto-confirmacion-reserva';
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
  recordatoriosActivos?: boolean;
}

interface IncomingMessage {
  phoneNumberId: string;
  from: string;
  text: string;
  /** ID del mensaje en WhatsApp. Se guarda para detectar reenvíos de Meta. */
  wamid?: string;
}

interface Deps {
  /** Reloj en milisegundos. Solo se pasa en tests; en producción es Date.now. */
  ahora?: () => number;
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
// Máximo de llamadas al modelo por mensaje del cliente. Alcanza de sobra para
// consultar -> reservar -> responder, y corta un modelo que se quede en loop.
const MAX_VUELTAS = 5;

// Presupuesto de tiempo por mensaje. La función del servidor corta a los 60s
// (maxDuration del webhook): dejamos margen para enviar la respuesta final.
const PRESUPUESTO_MS = 45_000;

const AVISO_CUPO =
  'Perdón, en este momento no puedo responderte automáticamente. Ya le avisé al equipo y te contestan a la brevedad. 🙏';
const AVISO_ERROR =
  'Perdón, tuve un problema técnico para responderte. Ya le avisé al equipo y te contestan a la brevedad. 🙏';

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
    wamid: incoming.wamid,
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

  const systemPrompt = buildSystemPrompt(
    // El teléfono viene del webhook de WhatsApp, no de lo que diga el modelo:
    // es el remitente real del mensaje.
    { ...negocio, telefonoCliente: incoming.from },
    getFechaArgentina()
  );
  const tools = getToolsForTier(negocio.tier);

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history,
    { role: 'user' as const, content: incoming.text },
  ];

  // --- Bucle de herramientas -------------------------------------------------
  // El modelo puede encadenar acciones (consultar -> reservar) y pedir varias en
  // una misma respuesta. Ejecutamos TODAS, en orden, y le devolvemos el
  // resultado de cada una hasta que responda con texto. Antes se ejecutaba solo
  // la primera acción y una sola vuelta: una reserva de dos horas registraba una
  // sola, y "consultar y reservar" en el mismo mensaje era imposible.
  const reloj = deps.ahora ?? Date.now;
  const inicio = reloj();
  const conversacion: any[] = [...messages];
  const herramientasUsadas: string[] = [];
  // Reservas que SÍ quedaron guardadas en este turno. Si el modelo falla después,
  // con esto armamos la confirmación real en vez de dejar al cliente a ciegas.
  const reservasHechas: ReservaConfirmada[] = [];

  const toolCalled = () => (herramientasUsadas.length ? herramientasUsadas.join(',') : undefined);

  // Respuesta de emergencia cuando el modelo no puede cerrar la conversación.
  const respuestaDeRespaldo = (esCupo: boolean) =>
    reservasHechas.length > 0
      ? reservasHechas.map(textoConfirmacionReserva).join('\n')
      : esCupo
        ? AVISO_CUPO
        : AVISO_ERROR;

  const responder = async (texto: string) => {
    const sendError = await sendAndSaveAssistantMessage(
      negocio,
      conversation.id,
      texto,
      incoming,
      deps,
      toolCalled()
    );
    return { handled: true, responseText: texto, sendError };
  };

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    if (vuelta > 0 && reloj() - inicio > PRESUPUESTO_MS) break;

    let respuesta;
    try {
      respuesta = await deps.callOpenRouter({ models: FREE_MODELS, messages: conversacion, tools });
    } catch (err) {
      // Cupo agotado, red caída, etc. El cliente NUNCA queda sin respuesta.
      const esCupo = err instanceof OpenRouterLimitError && err.esLimiteAgotado;
      return responder(respuestaDeRespaldo(esCupo));
    }

    const msg = respuesta.message ?? {};
    // Normalizamos cada tool_call: algunos modelos gratuitos los devuelven sin
    // id o sin type, y el proveedor rechaza el reenvío si falta alguno de los dos.
    const toolCalls: any[] = (Array.isArray(msg.tool_calls) ? msg.tool_calls : []).map(
      (tc: any, i: number) => ({
        id: tc?.id || `call_${vuelta}_${i}`,
        type: 'function',
        function: {
          name: tc?.function?.name ?? 'desconocida',
          arguments: tc?.function?.arguments ?? '{}',
        },
      })
    );

    // Sin herramientas pedidas: es la respuesta final para el cliente.
    if (toolCalls.length === 0) {
      const texto = typeof msg.content === 'string' ? msg.content.trim() : '';
      return responder(texto || respuestaDeRespaldo(false));
    }

    // El mensaje del asistente con sus tool_calls va ANTES de los resultados:
    // el protocolo exige que cada resultado responda a un tool_call previo.
    conversacion.push({ role: 'assistant', content: msg.content ?? null, tool_calls: toolCalls });

    // En orden y de a una: dos reservas nunca compiten entre sí.
    for (const toolCall of toolCalls) {
      const nombre: string = toolCall.function.name;
      herramientasUsadas.push(nombre);

      let resultado: { data?: any; error?: string; [k: string]: unknown };
      let args: Record<string, unknown> | null = null;

      try {
        const parseado = JSON.parse(toolCall.function.arguments || '{}');
        // JSON.parse acepta "null", "5" o "[]": solo sirve un objeto con los parámetros.
        if (parseado && typeof parseado === 'object' && !Array.isArray(parseado)) {
          args = parseado;
        } else {
          resultado = { error: 'Los argumentos tienen que ser un objeto JSON con los parámetros de la herramienta.' };
        }
      } catch {
        resultado = { error: 'Los argumentos no son JSON válido. Volvé a llamar a la herramienta con JSON correcto.' };
      }

      if (args !== null) {
        try {
          resultado = await deps.executeToolCall(nombre, args, {
            tenantId: negocio.tenant_id,
            tier: negocio.tier,
            phone: incoming.from,
          });
        } catch {
          resultado = { error: 'La herramienta falló. No se completó la acción: no la confirmes al cliente.' };
        }
      }

      if (nombre === 'registrar_cita' && resultado!.data?.reservado) {
        reservasHechas.push(resultado!.data as ReservaConfirmada);
      }

      conversacion.push({
        role: 'tool' as const,
        tool_call_id: toolCall.id,
        content: JSON.stringify(resultado!),
      });
    }
  }

  // Se agotaron las vueltas o el tiempo sin una respuesta en texto.
  return responder(respuestaDeRespaldo(false));
}
