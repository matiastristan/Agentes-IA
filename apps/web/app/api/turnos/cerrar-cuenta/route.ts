import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import { buildDetalleCuentaMessage } from '@/lib/turnos/build-detalle-cuenta-message';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { citaId, abonoId, fecha, clienteNombre, clienteTelefono, precioBase } = await request.json();

  if (!clienteTelefono) {
    return NextResponse.json(
      { error: 'No hay un teléfono cargado para este cliente — no se puede enviar el detalle' },
      { status: 400 }
    );
  }

  let query = supabase.from('consumos_turno').select('descripcion, precio').eq('tenant_id', user.id);
  if (citaId) query = query.eq('cita_id', citaId);
  if (abonoId) query = query.eq('abono_id', abonoId).eq('fecha', fecha);
  const { data: consumos } = await query;

  const { data: negocio } = await supabase
    .from('negocio')
    .select('nombre, phone_number_id, access_token')
    .eq('tenant_id', user.id)
    .single();

  if (!negocio?.phone_number_id || !negocio?.access_token) {
    return NextResponse.json({ error: 'Este negocio no tiene WhatsApp conectado' }, { status: 400 });
  }

  const mensaje = buildDetalleCuentaMessage({
    nombreNegocio: negocio.nombre,
    clienteNombre: clienteNombre ?? 'cliente',
    precioBase: precioBase ?? 0,
    consumos: consumos ?? [],
  });

  const result = await sendWhatsAppMessage({
    phoneNumberId: negocio.phone_number_id,
    accessToken: negocio.access_token,
    to: clienteTelefono,
    text: mensaje,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'No se pudo enviar el mensaje' }, { status: 500 });
  }

  if (citaId) {
    await supabase.from('citas').update({ estado: 'completada' }).eq('id', citaId).eq('tenant_id', user.id);
  }

  return NextResponse.json({ ok: true, mensaje });
}
