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
  const body = await request.json();

  const update: { precio?: number; duracion_minutos?: number; activo?: boolean } = {};
  if (typeof body.precio === 'number') update.precio = body.precio;
  if (typeof body.duracionMinutos === 'number') update.duracion_minutos = body.duracionMinutos;
  if (typeof body.activo === 'boolean') update.activo = body.activo;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const { error } = await supabase.from('servicios').update(update).eq('id', id).eq('tenant_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo actualizar el servicio' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
