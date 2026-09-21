import { NextRequest, NextResponse, after } from 'next/server';
import { evaluarMensajeEntrante } from '@/lib/whatsapp/evaluar-mensaje-entrante';
import { createServiceClient } from '@/lib/supabase/service-client';
import { verifyMetaSignature } from '@/lib/whatsapp/verify-signature';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import { sendLeadAlertEmail } from '@/lib/notifications/send-lead-alert-email';
import { callOpenRouter } from '@/lib/agent/openrouter-client';
import { executeToolCall } from '@/lib/agent/tool-handlers';
import { handleIncomingMessage } from '@/lib/agent/handle-incoming-message';
import { buildCatalogoParaNegocio } from '@/lib/agent/build-catalogo-para-negocio';

// El procesamiento corre en after() después de responderle a Meta. Esto le da a
// la función tiempo suficiente para que el modelo termine de responder.
export const maxDuration = 60;

// Meta llama a GET una sola vez, al configurar el webhook, para confirmar que el
// endpoint es tuyo. Ver: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  const isValid = verifyMetaSignature(rawBody, signature, process.env.META_APP_SECRET!);
  if (!isValid) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const change = body?.entry?.[0]?.changes?.[0]?.value;
  const message = change?.messages?.[0];
  const statuses = change?.statuses;
  const supabase = createServiceClient();

  // Meta manda las actualizaciones de estado de entrega (sent/delivered/read/failed)
  // en un array `statuses` separado del array `messages`. Actualizamos el
  // mensaje guardado que coincida con ese wamid.
  if (statuses?.length) {
    for (const s of statuses) {
      const nuevoEstado = ['sent', 'delivered', 'read', 'failed'].includes(s.status)
        ? s.status
        : null;
      if (!nuevoEstado) continue;

      await supabase
        .from('messages')
        .update({
          status: nuevoEstado,
          status_error: s.errors?.[0]?.title ?? null,
        })
        .eq('wamid', s.id);
    }
    return new NextResponse('OK', { status: 200 });
  }

  // Meta manda muchos tipos de eventos por este mismo webhook (status de entrega,
  // lectura, etc.) — solo nos importan los mensajes de texto entrantes. Todo lo
  // demás se responde 200 sin procesar, para que Meta no reintente.
  if (!message || message.type !== 'text') {
    return new NextResponse('OK', { status: 200 });
  }

  const phoneNumberId = change.metadata.phone_number_id;
  const wamidEntrante: string | undefined = message.id;

  // Defensa contra reenvíos de Meta: si ya procesamos este wamid, o si es un
  // reintento acumulado de hace horas, respondemos 200 y no hacemos nada.
  let yaProcesado = false;
  if (wamidEntrante) {
    const { data: existente } = await supabase
      .from('messages')
      .select('id')
      .eq('wamid', wamidEntrante)
      .maybeSingle();
    yaProcesado = !!existente;
  }

  const decision = evaluarMensajeEntrante({
    timestampSeg: message.timestamp ? Number(message.timestamp) : undefined,
    yaProcesado,
  });

  if (decision !== 'procesar') {
    console.info(`Mensaje ${wamidEntrante} descartado: ${decision}`);
    return new NextResponse('OK', { status: 200 });
  }

  // Le respondemos 200 a Meta AL INSTANTE y procesamos después. Antes el agente
  // tardaba ~20s con modelos gratuitos; Meta asumía que el webhook había fallado
  // y reenviaba el mismo mensaje, generando confirmaciones duplicadas.
  after(async () => {
    try {
      await procesarMensaje({
        phoneNumberId,
        from: message.from,
        text: message.text.body,
        wamid: wamidEntrante,
        supabase,
      });
    } catch (err) {
      console.error('Error procesando mensaje entrante:', err);
    }
  });

  return new NextResponse('OK', { status: 200 });
}

async function procesarMensaje({
  phoneNumberId,
  from,
  text,
  wamid,
  supabase,
}: {
  phoneNumberId: string;
  from: string;
  text: string;
  wamid: string | undefined;
  supabase: ReturnType<typeof createServiceClient>;
}) {
  const result = await handleIncomingMessage(
    { phoneNumberId, from, text, wamid },
    {
      findNegocioByPhoneNumberId: async (id) => {
        const { data } = await supabase.from('negocio').select('*').eq('phone_number_id', id).single();
        if (!data) return null;

        // negocio.catalogo es un campo vestigial que nunca se escribe —
        // el catálogo real vive en `servicios` (turnos) o `productos` (ventas).
        const catalogo = await buildCatalogoParaNegocio(
          supabase,
          data.tenant_id,
          data.tipo_crm as 'ventas' | 'turnos'
        );
        const { data: recursos } = await supabase
          .from('recursos')
          .select('nombre, subtipo, servicio:servicios!inner(activo)')
          .eq('tenant_id', data.tenant_id)
          .eq('activo', true)
          .eq('servicios.activo', true);
        return {
          ...data,
          catalogo,
          recursos: recursos ?? [],
          instruccionesAdicionales: data.instrucciones_adicionales,
        } as never;
      },
      findOrCreateConversation: async (tenantId, phoneFrom) => {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id, bot_desactivado')
          .eq('tenant_id', tenantId)
          .eq('phone_from', phoneFrom)
          .eq('estado', 'activa')
          .single();

        if (existing) return existing;

        const { data: created } = await supabase
          .from('conversations')
          .insert({ tenant_id: tenantId, phone_from: phoneFrom })
          .select('id, bot_desactivado')
          .single();

        return created!;
      },
      isClienteBloqueado: async (tenantId, phone) => {
        const { data } = await supabase
          .from('clientes')
          .select('bloqueado')
          .eq('tenant_id', tenantId)
          .eq('phone', phone)
          .single();

        return data?.bloqueado ?? false;
      },
      loadRecentMessages: async (tenantId, phoneFrom) => {
        const { data: convs } = await supabase
          .from('conversations')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('phone_from', phoneFrom);

        const conversationIds = (convs ?? []).map((c) => c.id);
        if (conversationIds.length === 0) return [];

        const { data } = await supabase
          .from('messages')
          .select('role, content')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
          .limit(10);

        return ((data ?? []) as Array<{ role: string; content: string }>)
          .reverse()
          .filter((m) => m.role === 'user' || m.role === 'assistant') as never;
      },
      saveMessage: async ({ tenantId, conversationId, role, content, toolCalled, wamid, status, statusError }) => {
        await supabase.from('messages').insert({
          tenant_id: tenantId,
          conversation_id: conversationId,
          role,
          content,
          tool_called: toolCalled ?? null,
          wamid: wamid ?? null,
          status: status ?? 'sent',
          status_error: statusError ?? null,
        });
      },
      callOpenRouter,
      executeToolCall: (name, args, ctx) =>
        executeToolCall(name, args, { ...ctx, phone: ctx.phone ?? from, supabase }),
      sendWhatsAppMessage,
      isAlertaLeadCalienteHabilitada: async (tenantId) => {
        const { data } = await supabase
          .from('negocio_feature_overrides')
          .select('habilitado')
          .eq('tenant_id', tenantId)
          .eq('feature_key', 'alertas_lead_caliente')
          .single();
        return data?.habilitado ?? false;
      },
      updateConversationTemperatura: async (conversationId, temperatura) => {
        await supabase.from('conversations').update({ temperatura }).eq('id', conversationId);
      },
      sendLeadAlertEmail,
    }
  );

  if (result.sendError) {
    console.error('El agente respondió pero no se pudo entregar por WhatsApp:', result.sendError);
  }
}
