import { createClient } from '@/lib/supabase/server';
import { KPICard } from '@/components/ui/kpi-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getDiaSemanaInfo } from '@/lib/turnos/get-dia-semana-info';
import { buildCalendarioSlots } from '@/lib/turnos/build-calendario-slots';
import { buildKpisPorCancha } from '@/lib/turnos/build-kpis-por-cancha';
import { buildFacturacionResumen } from '@/lib/turnos/build-facturacion-resumen';
import { filtrarRecursosVisibles } from '@/lib/turnos/filtrar-recursos-visibles';
import { colorParaSubtipo } from '@/lib/turnos/color-para-subtipo';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function inicioDeSemana(fecha: Date): string {
  const d = new Date(fecha);
  const dia = d.getUTCDay();
  const diff = dia === 0 ? 6 : dia - 1; // lunes como inicio de semana
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: negocio } = await supabase
    .from('negocio')
    .select('nombre, tier, tipo_crm, meta_connection_status')
    .eq('tenant_id', user!.id)
    .single();

  const conectado = negocio?.meta_connection_status === 'connected';
  const esTurnos = negocio?.tipo_crm === 'turnos';

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <div className="animate-fade-slide-in">
        <h1 className="text-2xl font-semibold text-text-primary mb-1">
          Hola, {negocio?.nombre ?? 'tu negocio'} 👋
        </h1>
        <p className="text-sm text-text-secondary mb-6 flex items-center gap-2">
          Plan <span className="font-medium capitalize">{negocio?.tier ?? 'base'}</span>
          <span className="text-border">·</span>
          <span
            className={
              'inline-flex items-center gap-1.5 ' + (conectado ? 'text-success' : 'text-warning')
            }
          >
            <span
              aria-hidden
              className={'h-1.5 w-1.5 rounded-full ' + (conectado ? 'bg-success' : 'bg-warning')}
            />
            WhatsApp {conectado ? 'conectado' : 'no conectado'}
          </span>
        </p>
      </div>

      {esTurnos ? (
        <DashboardTurnos tenantId={user!.id} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Mensajes hoy', value: 0, accent: 'primary' as const },
            { label: 'Conversiones', value: 0, accent: 'frio' as const },
            { label: 'Clientes nuevos', value: 0, accent: 'moderado' as const },
          ].map((kpi, i) => (
            <div key={kpi.label} className="animate-fade-slide-in" style={{ animationDelay: `${i * 60}ms` }}>
              <KPICard label={kpi.label} value={kpi.value} accent={kpi.accent} />
            </div>
          ))}
        </div>
      )}

      {!conectado && (
        <div className="mt-6 rounded-lg border border-warning-bg bg-warning-bg/40 p-4 animate-fade-slide-in">
          <p className="text-sm text-text-primary font-medium mb-1">
            Todavía no está conectado tu WhatsApp
          </p>
          <p className="text-sm text-text-secondary">
            Estamos terminando la configuración de tu número — te avisamos apenas quede activo.
          </p>
        </div>
      )}
    </main>
  );
}

async function DashboardTurnos({ tenantId }: { tenantId: string }) {
  const supabase = await createClient();

  const hoy = new Date();
  const fechaHoy = hoy.toISOString().slice(0, 10);
  const { diaSemana, diaKey } = getDiaSemanaInfo(fechaHoy);
  const fechaInicioSemana = inicioDeSemana(hoy);
  const fechaInicioMes = `${fechaHoy.slice(0, 7)}-01`;
  const fechaDesde31Dias = new Date(hoy.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: negocioHorarios }, { data: recursos }, { data: citasHoyRaw }, { data: abonos }, { data: citasRangoRaw }] =
    await Promise.all([
      supabase.from('negocio').select('horarios').eq('tenant_id', tenantId).single(),
      supabase
        .from('recursos')
        .select('id, nombre, subtipo, activo, servicio_id, servicio:servicios!inner(activo)')
        .eq('tenant_id', tenantId)
        .eq('activo', true)
        .eq('servicios.activo', true),
      supabase
        .from('citas')
        .select('id, recurso_id, hora, estado, customer_name, customer_id, servicio:servicios(duracion_minutos, precio)')
        .eq('tenant_id', tenantId)
        .eq('fecha', fechaHoy)
        .neq('estado', 'cancelada'),
      supabase
        .from('abonos')
        .select('id, recurso_id, dia_semana, hora_inicio, hora_fin, cliente_nombre, cliente_telefono, precio')
        .eq('tenant_id', tenantId)
        .eq('activo', true),
      supabase
        .from('citas')
        .select('id, recurso_id, fecha, estado, servicio:servicios(precio)')
        .eq('tenant_id', tenantId)
        .gte('fecha', fechaDesde31Dias),
    ]);

  const horarios = (negocioHorarios?.horarios as Record<string, string>) ?? {};
  const citasHoy = (citasHoyRaw ?? []).map((c) => ({
    ...c,
    servicio: Array.isArray(c.servicio) ? (c.servicio[0] ?? null) : c.servicio,
  }));

  const recursosVisibles = filtrarRecursosVisibles((recursos ?? []) as never);

  const slotsHoy = buildCalendarioSlots({
    fecha: fechaHoy,
    diaSemana,
    horarioDelDia: horarios[diaKey],
    recursos: recursosVisibles,
    subtipoFiltro: null,
    citas: citasHoy as never,
    abonos: abonos ?? [],
  });

  const kpisPorCancha = buildKpisPorCancha(slotsHoy as never, citasHoy);

  const totalOcupados = kpisPorCancha.reduce((acc, k) => acc + k.turnosTotal, 0);
  const totalSlots = kpisPorCancha.reduce((acc, k) => acc + k.turnosTotal + k.turnosDisponibles, 0);
  const tasaOcupacionHoy = totalSlots > 0 ? Math.round((totalOcupados / totalSlots) * 100) : 0;

  const citasRango = (citasRangoRaw ?? []).map((c) => ({
    id: c.id,
    recurso_id: c.recurso_id,
    estado: c.estado,
    fecha: c.fecha,
    precioServicio: Array.isArray(c.servicio) ? (c.servicio[0]?.precio ?? 0) : (c.servicio?.precio ?? 0),
  }));

  const { data: consumosRango } = await supabase
    .from('consumos_turno')
    .select('cita_id, abono_id, precio')
    .eq('tenant_id', tenantId)
    .gte('fecha', fechaDesde31Dias);

  const consumos = consumosRango ?? [];

  const resumenHoy = buildFacturacionResumen({
    citas: citasRango.filter((c) => c.fecha === fechaHoy),
    consumos,
  });
  const resumenSemana = buildFacturacionResumen({
    citas: citasRango.filter((c) => c.fecha >= fechaInicioSemana),
    consumos,
  });
  const resumenMes = buildFacturacionResumen({
    citas: citasRango.filter((c) => c.fecha >= fechaInicioMes),
    consumos,
  });

  const ticketPromedio =
    resumenMes.cantidadTurnos > 0 ? Math.round(resumenMes.total / resumenMes.cantidadTurnos) : 0;

  const nombrePorRecurso = Object.fromEntries(recursosVisibles.map((r) => [r.id, r.nombre]));
  const rankingAbonos = [...(abonos ?? [])].sort((a, b) => b.precio - a.precio).slice(0, 5);

  return (
    <>
      <h2 className="text-lg font-medium text-text-primary mb-3 animate-fade-slide-in">
        Hoy, por cancha
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpisPorCancha.map((k, i) => (
          <div key={k.recursoId} className="animate-fade-slide-in" style={{ animationDelay: `${i * 60}ms` }}>
            <Card
              className={cn(
                'p-5 border-l-4 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md',
                colorParaSubtipo(k.recursoSubtipo)
              )}
            >
              <p className="text-sm font-semibold text-text-primary mb-3">{k.recursoNombre}</p>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Turnos</span>
                <span className="font-semibold text-primary">{k.turnosTotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Disponibles</span>
                <span className="font-semibold text-success">{k.turnosDisponibles}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">No show</span>
                <span className="font-semibold text-error">{k.noShow}</span>
              </div>
            </Card>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-medium text-text-primary mb-3 animate-fade-slide-in">Facturación</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Hoy', value: `$${resumenHoy.total}`, accent: 'caliente' as const },
          { label: 'Esta semana', value: `$${resumenSemana.total}`, accent: 'moderado' as const },
          { label: 'Este mes', value: `$${resumenMes.total}`, accent: 'primary' as const },
        ].map((kpi, i) => (
          <div key={kpi.label} className="animate-fade-slide-in" style={{ animationDelay: `${i * 60}ms` }}>
            <KPICard label={kpi.label} value={kpi.value} accent={kpi.accent} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="animate-fade-slide-in">
          <CardHeader>
            <CardTitle>Facturación por cancha (este mes)</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(resumenMes.porCancha).length === 0 ? (
              <p className="text-sm text-text-muted">Todavía no hay turnos completados este mes.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(resumenMes.porCancha).map(([recursoId, monto]) => (
                  <div key={recursoId} className="flex justify-between text-sm">
                    <span className="text-text-secondary">{nombrePorRecurso[recursoId] ?? recursoId}</span>
                    <span className="font-medium">${monto}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-slide-in">
          <CardHeader>
            <CardTitle>Ranking de clientes mensualizados</CardTitle>
          </CardHeader>
          <CardContent>
            {rankingAbonos.length === 0 ? (
              <p className="text-sm text-text-muted">Todavía no cargaste clientes mensualizados.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {rankingAbonos.map((a, i) => (
                  <div key={a.id} className="flex justify-between text-sm">
                    <span className="text-text-secondary">
                      {i + 1}. {a.cliente_nombre}
                    </span>
                    <span className="font-medium">${a.precio}/turno</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-medium text-text-primary mb-3 animate-fade-slide-in">
        Otros indicadores
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="animate-fade-slide-in">
          <KPICard label="Tasa de ocupación hoy" value={`${tasaOcupacionHoy}%`} accent="frio" />
        </div>
        <div className="animate-fade-slide-in" style={{ animationDelay: '60ms' }}>
          <KPICard label="Ticket promedio (este mes)" value={`$${ticketPromedio}`} accent="caliente" />
        </div>
      </div>
    </>
  );
}
