import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { recursoId, clienteNombre, clienteTelefono, diaSemana, horaInicio, horaFin, precio } =
    await request.json();

  if (!recursoId || !clienteNombre?.trim() || diaSemana === undefined || !horaInicio || !horaFin) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
  }
  if (typeof precio !== 'number' || precio < 0) {
    return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('abonos')
    .insert({
      tenant_id: user.id,
      recurso_id: recursoId,
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono || null,
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      precio,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'No se pudo crear el abono' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, abono: data });
}
