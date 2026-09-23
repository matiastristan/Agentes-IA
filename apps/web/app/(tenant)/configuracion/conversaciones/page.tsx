import { createClient } from '@/lib/supabase/server';
import { buildListaConversaciones } from '@/lib/conversaciones/build-lista-conversaciones';
import { ConversacionesLista } from '@/components/conversaciones/conversaciones-lista';

export const dynamic = 'force-dynamic';

export default async function ConversacionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user!.id;

  const [{ data: conversaciones }, { data: mensajes }, { data: bloqueados }, { data: citas }] =
    await Promise.all([
      supabase
        .from('conversations')
        .select('id, phone_from, customer_name, temperatura, bot_desactivado, created_at')
        .eq('tenant_id', tenantId),
      // Solo hace falta el último mensaje de cada conversación: traemos los más
      // recientes y la función se queda con el primero de cada una.
      supabase
        .from('messages')
        .select('conversation_id, role, content, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase.from('clientes').select('phone').eq('tenant_id', tenantId).eq('bloqueado', true),
      // El nombre del cliente suele estar en sus turnos, no en la conversación
      supabase
        .from('citas')
        .select('customer_id, customer_name, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1000),
    ]);

  const nombresPorTelefono: Record<string, string> = {};
  for (const c of citas ?? []) {
    if (c.customer_id && c.customer_name && !nombresPorTelefono[c.customer_id]) {
      nombresPorTelefono[c.customer_id] = c.customer_name;
    }
  }

  const lista = buildListaConversaciones({
    conversaciones: conversaciones ?? [],
    mensajes: mensajes ?? [],
    nombresPorTelefono,
    telefonosBloqueados: (bloqueados ?? []).map((b) => b.phone),
  });

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-1 animate-fade-slide-in">Conversaciones</h1>
      <p className="text-sm text-text-secondary mb-6 animate-fade-slide-in">
        Todo lo que hablaron tus clientes con el agente. Podés pausar el bot, responder vos o bloquear un número.
      </p>
      <ConversacionesLista items={lista} />
    </main>
  );
}
