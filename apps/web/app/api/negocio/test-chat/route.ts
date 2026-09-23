import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleIncomingMessage } from '@/lib/agent/handle-incoming-message';
import { buildCatalogoParaNegocio } from '@/lib/agent/build-catalogo-para-negocio';
import { callOpenRouter } from '@/lib/agent/openrouter-client';
import { executeToolCall } from '@/lib/agent/tool-handlers';

const TEST_CHAT_FROM = 'TEST-CHAT';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { text } = await request.json();
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Falta el texto del mensaje' }, { status: 400 });
  }

  let respuestaAgente = '';

  await handleIncomingMessage(
    { phoneNumberId: 'irrelevante-en-test-chat', from: TEST_CHAT_FROM, text },
    {
      findNegocioByPhoneNumberId: async () => {
        const { data } = await supabase.from('negocio').select('*').eq('tenant_id', user.id).single();
        if (!data) return null;
        const catalogo = await buildCatalogoParaNegocio(
          supabase,
          user.id,
          data.tipo_crm as 'ventas' | 'turnos'
        );
        const { data: recursos } = await supabase
          .from('recursos')
          .select('nombre, subtipo, servicio:servicios!inner(activo)')
          .eq('tenant_id', user.id)
          .eq('activo', true)
          .eq('servicios.activo', true);
        return {
          ...data,
          catalogo,
          recursos: recursos ?? [],
          instruccionesAdicionales: data.instrucciones_adicionales,
          recordatoriosActivos: data.recordatorios_activos ?? false,
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
      isClienteBloqueado: async () => false,
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
          status: 'sent',
        });
      },
      callOpenRouter,
      executeToolCall: (name, args, ctx) =>
        executeToolCall(name, args, { ...ctx, phone: ctx.phone ?? TEST_CHAT_FROM, supabase }),
      sendWhatsAppMessage: async ({ text: respuesta }) => {
        respuestaAgente = respuesta;
        return { success: true, wamid: 'test-chat' };
      },
      isAlertaLeadCalienteHabilitada: async () => false,
      updateConversationTemperatura: async () => {},
      sendLeadAlertEmail: async () => ({ success: true }),
    }
  );

  return NextResponse.json({ respuesta: respuestaAgente || '(el agente no generó una respuesta)' });
}
