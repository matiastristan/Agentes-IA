import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { getFechaArgentina } from '@/lib/agent/get-fecha-argentina';
import { buildRecordatorios } from '@/lib/recordatorios/build-recordatorios';
import { enviarRecordatorios } from '@/lib/recordatorios/enviar-recordatorios';
import { sendWhatsAppTemplate } from '@/lib/whatsapp/send-template';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import { estadoVentana24h } from '@/lib/conversaciones/ventana-24h';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const IDIOMA_PLANTILLA = process.env.WHATSAPP_TEMPLATE_RECORDATORIO_IDIOMA ?? 'es_AR';

/**
 * Recordatorios de los turnos de MAÑANA. Lo dispara el cron de Vercel una vez
 * por día (ver vercel.json). Acepta ?fecha=YYYY-MM-DD para reenviar un día
 * puntual a mano; es idempotente, el registro con clave única evita duplicados.
 */
export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  const autorizacion = request.headers.get('authorization');
  if (!secreto || autorizacion !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const plantilla = process.env.WHATSAPP_TEMPLATE_RECORDATORIO ?? null;

  const fechaParam = request.nextUrl.searchParams.get('fecha');
  const fecha =
    fechaParam ?? getFechaArgentina(new Date(Date.now() + 24 * 60 * 60 * 1000)); // mañana en Argentina

  const { data: negocios } = await supabase
    .from('negocio')
    .select('tenant_id, nombre, phone_number_id, access_token')
    .eq('recordatorios_activos', true)
    .eq('estado_cuenta', 'activo')
    .not('phone_number_id', 'is', null)
    .not('access_token', 'is', null);

  const porNegocio: Array<Record<string, unknown>> = [];

  for (const negocio of negocios ?? []) {
    const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();

    const [{ data: citasRaw }, { data: abonosRaw }, { data: enviadosRaw }] = await Promise.all([
      supabase
        .from('citas')
        .select('id, hora, customer_id, customer_name, recurso_id, estado, recurso:recursos(nombre)')
        .eq('tenant_id', negocio.tenant_id)
        .eq('fecha', fecha)
        .neq('estado', 'cancelada'),
      supabase
        .from('abonos')
        .select('id, cliente_nombre, cliente_telefono, hora_inicio, hora_fin, recurso:recursos(nombre)')
        .eq('tenant_id', negocio.tenant_id)
        .eq('dia_semana', diaSemana)
        .eq('activo', true),
      supabase
        .from('recordatorios_enviados')
        .select('cita_id, abono_id')
        .eq('tenant_id', negocio.tenant_id)
        .eq('fecha', fecha)
        .eq('status', 'enviado'),
    ]);

    const nombreRecurso = (r: unknown) =>
      (Array.isArray(r) ? r[0]?.nombre : (r as { nombre?: string } | null)?.nombre) ?? 'tu cancha';

    const recordatorios = buildRecordatorios({
      fecha,
      citas: (citasRaw ?? []).map((c: Record<string, unknown>) => ({
        ...c,
        recurso_nombre: nombreRecurso(c.recurso),
      })) as never,
      abonos: (abonosRaw ?? []).map((a: Record<string, unknown>) => ({
        ...a,
        recurso_nombre: nombreRecurso(a.recurso),
      })) as never,
      citasYaEnviadas: (enviadosRaw ?? [])
        .map((e: { cita_id: string | null }) => e.cita_id)
        .filter(Boolean) as string[],
      abonosYaEnviados: (enviadosRaw ?? [])
        .map((e: { abono_id: string | null }) => e.abono_id)
        .filter(Boolean) as string[],
    });

    const resumen = await enviarRecordatorios(
      recordatorios,
      { plantilla, idioma: IDIOMA_PLANTILLA },
      {
        enviarPlantilla: (p) =>
          sendWhatsAppTemplate({
            phoneNumberId: negocio.phone_number_id!,
            accessToken: negocio.access_token!,
            ...p,
          }),
        enviarTexto: (p) =>
          sendWhatsAppMessage({
            phoneNumberId: negocio.phone_number_id!,
            accessToken: negocio.access_token!,
            ...p,
          }),
        ventanaAbierta: async (telefono) => {
          // Dos consultas simples en vez de un join con alias: el filtro sobre
          // una tabla embebida se salteaba y daba falsos positivos.
          const { data: conversacion } = await supabase
            .from('conversations')
            .select('id')
            .eq('tenant_id', negocio.tenant_id)
            .eq('phone_from', telefono)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!conversacion) return false;

          const { data: ultimo } = await supabase
            .from('messages')
            .select('created_at')
            .eq('tenant_id', negocio.tenant_id)
            .eq('conversation_id', conversacion.id)
            .eq('role', 'user')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return estadoVentana24h(ultimo?.created_at ?? null).abierta;
        },
        registrar: async (r) => {
          const { error } = await supabase.from('recordatorios_enviados').insert({
            tenant_id: negocio.tenant_id,
            cita_id: r.citaId ?? null,
            abono_id: r.abonoId ?? null,
            fecha: r.fecha,
            telefono: r.telefono,
            canal: r.canal,
            status: r.status,
            error: r.error ?? null,
          });
          // 23505 = ya existía: otro corrido del cron lo mandó primero.
          return !error || error.code !== '23505';
        },
      }
    );

    porNegocio.push({ negocio: negocio.nombre, ...resumen });
  }

  return NextResponse.json({ ok: true, fecha, plantillaConfigurada: !!plantilla, negocios: porNegocio });
}
