import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { verifyMetaSignature } from '@/lib/whatsapp/verify-signature';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import { callOpenRouter } from '@/lib/agent/openrouter-client';
import { executeToolCall } from '@/lib/agent/tool-handlers';
import { handleIncomingMessage } from '@/lib/agent/handle-incoming-message';

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

  // Meta manda muchos tipos de eventos por este mismo webhook (status de entrega,
  // lectura, etc.) — solo nos importan los mensajes de texto entrantes. Todo lo
  // demás se responde 200 sin procesar, para que Meta no reintente.
  if (!message || message.type !== 'text') {
    return new NextResponse('OK', { status: 200 });
  }

  const phoneNumberId = change.metadata.phone_number_id;
  const supabase = createServiceClient();

  const result = await handleIncomingMessage(
    { phoneNumberId, from: message.from, text: message.text.body },
    {
      findNegocioByPhoneNumberId: async (id) => {
        const { data } = await supabase.from('negocio').select('*').eq('phone_number_id', id).single();
        return data as never;
      },
      findOrCreateConversation: async (tenantId, phoneFrom) => {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('phone_from', phoneFrom)
          .eq('estado', 'activa')
          .single();

        if (existing) return existing;

        const { data: created } = await supabase
          .from('conversations')
          .insert({ tenant_id: tenantId, phone_from: phoneFrom })
          .select('id')
          .single();

        return created!;
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
      saveMessage: async ({ tenantId, conversationId, role, content, toolCalled }) => {
        await supabase.from('messages').insert({
          tenant_id: tenantId,
          conversation_id: conversationId,
          role,
          content,
          tool_called: toolCalled ?? null,
        });
      },
      callOpenRouter,
      executeToolCall: (name, args, ctx) =>
        executeToolCall(name, args, { ...ctx, phone: ctx.phone ?? message.from, supabase }),
      sendWhatsAppMessage,
    }
  );

  if (result.sendError) {
    console.error('El agente respondió pero no se pudo entregar por WhatsApp:', result.sendError);
  }

  return new NextResponse('OK', { status: 200 });
}
