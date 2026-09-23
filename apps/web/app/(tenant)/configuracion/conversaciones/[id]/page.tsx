import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { estadoVentana24h } from '@/lib/conversaciones/ventana-24h';
import { ConversacionDetalle } from '@/components/conversaciones/conversacion-detalle';

export const dynamic = 'force-dynamic';

// Se muestran los últimos mensajes: suficiente para el contexto sin cargar
// conversaciones enormes enteras.
const LIMITE_MENSAJES = 300;

export default async function ConversacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user!.id;

  const { data: conversacion } = await supabase
    .from('conversations')
    .select('id, phone_from, customer_name, temperatura, bot_desactivado')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!conversacion) notFound();

  const [{ data: mensajesDesc }, { data: cliente }, { data: cita }] = await Promise.all([
    supabase
      .from('messages')
      .select('id, role, content, tool_called, status, status_error, created_at')
      .eq('conversation_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(LIMITE_MENSAJES),
    supabase
      .from('clientes')
      .select('bloqueado')
      .eq('tenant_id', tenantId)
      .eq('phone', conversacion.phone_from)
      .maybeSingle(),
    supabase
      .from('citas')
      .select('customer_name')
      .eq('tenant_id', tenantId)
      .eq('customer_id', conversacion.phone_from)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const mensajes = [...(mensajesDesc ?? [])].reverse();
  const ultimoDelCliente = [...mensajes].reverse().find((m) => m.role === 'user');

  return (
    <ConversacionDetalle
      id={conversacion.id}
      telefono={conversacion.phone_from}
      nombre={conversacion.customer_name || cita?.customer_name || null}
      temperatura={conversacion.temperatura}
      botActivo={!conversacion.bot_desactivado}
      bloqueado={cliente?.bloqueado ?? false}
      mensajes={mensajes}
      ventana={estadoVentana24h(ultimoDelCliente?.created_at ?? null)}
    />
  );
}
