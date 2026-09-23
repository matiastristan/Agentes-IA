import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Bloquear / desbloquear al cliente de una conversación. El bloqueo vive en
// `clientes` (por teléfono), que es lo que consulta el webhook: un cliente
// bloqueado queda ignorado en TODAS sus conversaciones, no solo en esta.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.bloqueado !== 'boolean') {
    return NextResponse.json({ error: 'Falta bloqueado (true/false)' }, { status: 400 });
  }

  const { data: conversacion } = await supabase
    .from('conversations')
    .select('phone_from')
    .eq('id', id)
    .eq('tenant_id', user.id)
    .maybeSingle();
  if (!conversacion) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });

  // Upsert: el cliente puede no existir todavía en `clientes` (se crea al bloquearlo).
  const { error } = await supabase
    .from('clientes')
    .upsert(
      {
        tenant_id: user.id,
        phone: conversacion.phone_from,
        bloqueado: body.bloqueado,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,phone' }
    );

  if (error) return NextResponse.json({ error: 'No se pudo actualizar el bloqueo' }, { status: 500 });
  return NextResponse.json({ ok: true, bloqueado: body.bloqueado });
}
