import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateServicio } from '@/lib/turnos/validate-servicio';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { valid, errors } = validateServicio(body);
  if (!valid) {
    return NextResponse.json({ error: 'Datos inválidos', errors }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('servicios')
    .insert({
      tenant_id: user.id,
      nombre: body.nombre,
      duracion_minutos: body.duracionMinutos,
      precio: body.precio,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'No se pudo crear el servicio' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, servicio: data });
}
