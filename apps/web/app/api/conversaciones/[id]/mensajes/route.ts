import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import { enviarMensajeManual } from '@/lib/conversaciones/enviar-mensaje-manual';

const STATUS_POR_CODIGO = {
  texto_invalido: 400,
  no_encontrada: 404,
  ventana_cerrada: 409,
  sin_credenciales: 409,
  envio_fallido: 502,
} as const;

// Envío manual del dueño al cliente.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const tenantId = user.id;

  const resultado = await enviarMensajeManual(
    { conversationId: id, texto: typeof body?.texto === 'string' ? body.texto : '' },
    {
      cargarConversacion: async (conversationId) => {
        const { data } = await supabase
          .from('conversations')
          .select('id, phone_from')
          .eq('id', conversationId)
          .eq('tenant_id', tenantId)
          .maybeSingle();
        return data;
      },
      ultimoMensajeClienteFecha: async (conversationId) => {
        const { data } = await supabase
          .from('messages')
          .select('created_at')
          .eq('conversation_id', conversationId)
          .eq('tenant_id', tenantId)
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return data?.created_at ?? null;
      },
      cargarCredenciales: async () => {
        const { data } = await supabase
          .from('negocio')
          .select('phone_number_id, access_token')
          .eq('tenant_id', tenantId)
          .maybeSingle();
        return data?.phone_number_id && data?.access_token
          ? { phone_number_id: data.phone_number_id, access_token: data.access_token }
          : null;
      },
      enviar: sendWhatsAppMessage,
      guardarMensaje: async (m) => {
        await supabase.from('messages').insert({
          tenant_id: tenantId,
          conversation_id: m.conversationId,
          role: 'assistant',
          content: m.content,
          tool_called: m.toolCalled,
          wamid: m.wamid ?? null,
          status: m.status,
          status_error: m.statusError ?? null,
        });
      },
      pausarBot: async (conversationId) => {
        await supabase
          .from('conversations')
          .update({ bot_desactivado: true, updated_at: new Date().toISOString() })
          .eq('id', conversationId)
          .eq('tenant_id', tenantId);
      },
    }
  );

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.error, codigo: resultado.codigo },
      { status: STATUS_POR_CODIGO[resultado.codigo] }
    );
  }
  return NextResponse.json({ ok: true, botPausado: true });
}
