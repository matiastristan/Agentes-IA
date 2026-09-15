import { createClient } from '@/lib/supabase/server';
import { pickCalendarView } from '@/lib/turnos/pick-calendar-view';
import { mapCitaEstadoToTurnoCardEstado } from '@/lib/turnos/map-cita-estado';
import { TurnoCard } from '@/components/turnos/turno-card';

export default async function TurnosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recursos } = await supabase
    .from('recursos')
    .select('*')
    .eq('tenant_id', user!.id)
    .eq('activo', true);

  const vista = pickCalendarView(recursos?.length ?? 0);

  const hoy = new Date().toISOString().slice(0, 10);
  const { data: citas } = await supabase
    .from('citas')
    .select('*')
    .eq('tenant_id', user!.id)
    .eq('fecha', hoy);

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">
        Calendario — vista {vista === 'dia' ? 'Día' : 'Semana'}
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(citas ?? []).map((c) => (
          <TurnoCard
            key={c.id}
            estado={mapCitaEstadoToTurnoCardEstado(c.estado)}
            hora={c.hora}
            clienteNombre={c.customer_name ?? undefined}
          />
        ))}
      </div>
    </main>
  );
}
