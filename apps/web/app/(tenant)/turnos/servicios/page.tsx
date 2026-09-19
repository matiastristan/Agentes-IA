import { createClient } from '@/lib/supabase/server';
import { NuevoServicioForm } from '@/components/turnos/nuevo-servicio-form';
import { ServiciosTable } from '@/components/turnos/servicios-table';

export const dynamic = 'force-dynamic';

export default async function ServiciosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: servicios } = await supabase
    .from('servicios')
    .select('*')
    .eq('tenant_id', user!.id)
    .order('created_at', { ascending: false });

  const lista = servicios ?? [];

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">
        Servicios
      </h1>

      <div className="animate-fade-slide-in">
        <NuevoServicioForm />
      </div>

      {lista.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center animate-fade-slide-in">
          <p className="text-sm text-text-muted">Todavía no cargaste ningún servicio.</p>
        </div>
      ) : (
        <div className="overflow-x-auto animate-fade-slide-in">
          <ServiciosTable servicios={lista} />
        </div>
      )}
    </main>
  );
}
