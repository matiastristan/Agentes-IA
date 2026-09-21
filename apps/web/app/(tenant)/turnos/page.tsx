import { createClient } from '@/lib/supabase/server';
import { getDiaSemanaInfo } from '@/lib/turnos/get-dia-semana-info';
import { filtrarRecursosVisibles } from '@/lib/turnos/filtrar-recursos-visibles';
import { CalendarioClient } from '@/components/turnos/calendario-client';

export const dynamic = 'force-dynamic';

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; cancha?: string }>;
}) {
  const { fecha: fechaParam, cancha } = await searchParams;
  const fecha = fechaParam ?? new Date().toISOString().slice(0, 10);
  const { diaSemana, diaKey } = getDiaSemanaInfo(fecha);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: negocio }, { data: recursos }, { data: citasRaw }, { data: abonos }, { data: productos }, { data: servicios }, { data: combos }] =
    await Promise.all([
      supabase.from('negocio').select('horarios').eq('tenant_id', user!.id).single(),
      supabase
        .from('recursos')
        .select('id, nombre, subtipo, activo, servicio_id, servicio:servicios!inner(activo)')
        .eq('tenant_id', user!.id)
        .eq('activo', true)
        .eq('servicios.activo', true),
      supabase
        .from('citas')
        .select('id, recurso_id, hora, estado, customer_name, customer_id, servicio:servicios(duracion_minutos, precio)')
        .eq('tenant_id', user!.id)
        .eq('fecha', fecha)
        .neq('estado', 'cancelada'),
      supabase
        .from('abonos')
        .select('id, recurso_id, dia_semana, hora_inicio, hora_fin, cliente_nombre, cliente_telefono, precio')
        .eq('tenant_id', user!.id)
        .eq('activo', true),
      supabase
        .from('productos')
        .select('id, nombre, precio, stock')
        .eq('tenant_id', user!.id)
        .eq('activo', true),
      supabase.from('servicios').select('id, nombre, precio').eq('tenant_id', user!.id).eq('activo', true),
      supabase
        .from('combos')
        .select('id, nombre, precio')
        .eq('tenant_id', user!.id)
        .eq('activo', true),
    ]);

  const horarios = (negocio?.horarios as Record<string, string>) ?? {};
  const horarioDelDia = horarios[diaKey];

  const citas = (citasRaw ?? []).map((c) => ({
    ...c,
    servicio: Array.isArray(c.servicio) ? (c.servicio[0] ?? null) : c.servicio,
  }));

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-1 animate-fade-slide-in">
        Calendario
      </h1>
      <p className="text-sm text-text-secondary mb-6 animate-fade-slide-in">
        {new Date(`${fecha}T00:00:00Z`).toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        })}
      </p>

      <CalendarioClient
        fecha={fecha}
        diaSemana={diaSemana}
        horarioDelDia={horarioDelDia}
        recursos={filtrarRecursosVisibles((recursos ?? []) as never)}
        citas={citas as never}
        abonos={abonos ?? []}
        productos={productos ?? []}
        combos={combos ?? []}
        servicios={servicios ?? []}
        subtipoActual={cancha ?? null}
      />
    </main>
  );
}
