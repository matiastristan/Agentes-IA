import { createClient } from '@/lib/supabase/server';
import { pickCalendarView } from '@/lib/turnos/pick-calendar-view';
import { mapCitaEstadoToTurnoCardEstado } from '@/lib/turnos/map-cita-estado';
import { TurnoCard } from '@/components/turnos/turno-card';

export default async function TurnosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hoy = new Date().toISOString().slice(0, 10);

  const [{ data: recursos }, { data: citas }] = await Promise.all([
    supabase.from('recursos').select('*').eq('tenant_id', user!.id).eq('activo', true),
    supabase
      .from('citas')
      .select('*')
      .eq('tenant_id', user!.id)
      .eq('fecha', hoy)
      .order('hora', { ascending: true }),
  ]);

  const vista = pickCalendarView(recursos?.length ?? 0);

  const lista = citas ?? [];

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 animate-fade-slide-in">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Calendario</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}vista {vista === 'dia' ? 'Día' : 'Semana'}
          </p>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center animate-fade-slide-in">
          <p className="text-sm text-text-muted">No hay turnos agendados para hoy.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {lista.map((c, i) => (
            <div key={c.id} className="animate-fade-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
              <TurnoCard
                estado={mapCitaEstadoToTurnoCardEstado(c.estado)}
                hora={c.hora}
                clienteNombre={c.customer_name ?? undefined}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
