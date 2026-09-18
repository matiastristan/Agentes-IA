import { createClient } from '@/lib/supabase/server';
import { NuevoAbonoForm } from '@/components/turnos/nuevo-abono-form';
import { AbonosTable } from '@/components/turnos/abonos-table';

export default async function AbonosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: recursos }, { data: abonosRaw }] = await Promise.all([
    supabase.from('recursos').select('id, nombre').eq('tenant_id', user!.id).eq('activo', true),
    supabase
      .from('abonos')
      .select('id, cliente_nombre, cliente_telefono, dia_semana, hora_inicio, hora_fin, precio, activo, recurso:recursos(nombre)')
      .eq('tenant_id', user!.id)
      .order('dia_semana', { ascending: true }) as unknown as Promise<{
      data: Array<{
        id: string;
        cliente_nombre: string;
        cliente_telefono: string | null;
        dia_semana: number;
        hora_inicio: string;
        hora_fin: string;
        precio: number;
        activo: boolean;
        recurso: { nombre: string } | { nombre: string }[] | null;
      }> | null;
    }>,
  ]);

  const abonos = (abonosRaw ?? []).map((a) => ({
    ...a,
    recurso_nombre: Array.isArray(a.recurso) ? (a.recurso[0]?.nombre ?? '—') : (a.recurso?.nombre ?? '—'),
  }));

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-1 animate-fade-slide-in">
        Clientes mensualizados
      </h1>
      <p className="text-sm text-text-secondary mb-6 animate-fade-slide-in">
        Reservan la misma cancha, mismo día y horario, todas las semanas.
      </p>

      <div className="animate-fade-slide-in">
        <NuevoAbonoForm recursos={recursos ?? []} />
      </div>

      {abonos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center animate-fade-slide-in">
          <p className="text-sm text-text-muted">Todavía no cargaste clientes mensualizados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto animate-fade-slide-in">
          <AbonosTable abonos={abonos as never} />
        </div>
      )}
    </main>
  );
}
