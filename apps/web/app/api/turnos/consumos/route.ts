import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const citaId = searchParams.get('cita_id');
  const abonoId = searchParams.get('abono_id');
  const fecha = searchParams.get('fecha');

  let query = supabase.from('consumos_turno').select('*').eq('tenant_id', user.id);
  if (citaId) query = query.eq('cita_id', citaId);
  if (abonoId) query = query.eq('abono_id', abonoId).eq('fecha', fecha ?? '');

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'No se pudieron cargar los consumos' }, { status: 500 });
  }

  return NextResponse.json({ consumos: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { citaId, abonoId, fecha, descripcion, precio, productoId } = await request.json();

  if (!citaId && !abonoId) {
    return NextResponse.json({ error: 'Falta cita_id o abono_id' }, { status: 400 });
  }
  if (typeof descripcion !== 'string' || !descripcion.trim()) {
    return NextResponse.json({ error: 'Falta la descripción' }, { status: 400 });
  }
  if (typeof precio !== 'number' || precio < 0) {
    return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('consumos_turno')
    .insert({
      tenant_id: user.id,
      cita_id: citaId ?? null,
      abono_id: abonoId ?? null,
      fecha: fecha ?? new Date().toISOString().slice(0, 10),
      descripcion,
      precio,
      producto_id: productoId ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'No se pudo agregar el consumo' }, { status: 500 });
  }

  // Si el consumo viene de un producto real del stock, descontamos 1 unidad
  if (productoId) {
    const { data: producto } = await supabase
      .from('productos')
      .select('stock')
      .eq('id', productoId)
      .eq('tenant_id', user.id)
      .single();
    if (producto) {
      await supabase
        .from('productos')
        .update({ stock: Math.max(0, producto.stock - 1) })
        .eq('id', productoId)
        .eq('tenant_id', user.id);
    }
  }

  return NextResponse.json({ ok: true, consumo: data });
}
