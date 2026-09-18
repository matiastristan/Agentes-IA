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

  const { fecha, hora, recursoId, servicioId, clienteNombre, clienteTelefono } = await request.json();

  if (!fecha || !hora || !recursoId || !clienteNombre?.trim()) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('citas')
    .insert({
      tenant_id: user.id,
      fecha,
      hora,
      recurso_id: recursoId,
      servicio_id: servicioId || null,
      customer_name: clienteNombre,
      customer_id: clienteTelefono || 'sin-telefono',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'No se pudo crear el turno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cita: data });
}
