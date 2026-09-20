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

  const update: {
    nombre?: string;
    subtipo?: string | null;
    precio?: number;
    duracion_minutos?: number;
    activo?: boolean;
  } = {};
  if (typeof body.nombre === 'string') update.nombre = body.nombre;
  if ('subtipo' in body) update.subtipo = body.subtipo || null;
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

  // Sincronizar el recurso "espejo": nombre/subtipo/activo se reflejan en la columna del calendario.
  const recursoUpdate: { nombre?: string; subtipo?: string | null; activo?: boolean } = {};
  if ('nombre' in update) recursoUpdate.nombre = update.nombre;
  if ('subtipo' in update) recursoUpdate.subtipo = update.subtipo;
  if ('activo' in update) recursoUpdate.activo = update.activo;
  if (Object.keys(recursoUpdate).length > 0) {
    await supabase
      .from('recursos')
      .update(recursoUpdate)
      .eq('servicio_id', id)
      .eq('tenant_id', user.id);
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

  // El recurso espejo tiene ON DELETE CASCADE contra servicios, así que
  // borrar el servicio elimina automáticamente la cancha del calendario.
  const { error } = await supabase.from('servicios').delete().eq('id', id).eq('tenant_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo eliminar el servicio' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
