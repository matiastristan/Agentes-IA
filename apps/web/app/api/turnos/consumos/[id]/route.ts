import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await supabase.from('consumos_turno').delete().eq('id', id).eq('tenant_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
