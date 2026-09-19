import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { estado } = await request.json();

  const validEstados = ['pendiente', 'confirmada', 'cancelada', 'completada', 'no_show', 'reprogramada'];
  if (!validEstados.includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  const { error } = await supabase.from('citas').update({ estado }).eq('id', id).eq('tenant_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo actualizar el turno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await supabase.from('citas').delete().eq('id', id).eq('tenant_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo eliminar el turno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
