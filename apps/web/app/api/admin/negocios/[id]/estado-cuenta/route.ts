import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { requireAdminSession } from '@/lib/admin/require-admin-session';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { estado_cuenta } = await request.json();

  const validEstados = ['activo', 'suspendido_pago', 'baja_definitiva'];
  if (!validEstados.includes(estado_cuenta)) {
    return NextResponse.json({ error: 'estado_cuenta inválido' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('negocio').update({ estado_cuenta }).eq('tenant_id', id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
