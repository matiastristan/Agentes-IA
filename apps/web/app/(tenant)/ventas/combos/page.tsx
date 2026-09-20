import { createClient } from '@/lib/supabase/server';
import { NuevoComboForm } from '@/components/ventas/nuevo-combo-form';
import { CombosList } from '@/components/ventas/combos-list';

export const dynamic = 'force-dynamic';

export default async function CombosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: productos }, { data: combos }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, nombre, precio, rubro, atributos')
      .eq('tenant_id', user!.id)
      .eq('activo', true)
      .order('nombre'),
    supabase.from('combos').select('*').eq('tenant_id', user!.id).order('created_at', { ascending: false }),
  ]);

  const lista = combos ?? [];

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">
        Combos
      </h1>

      <div className="animate-fade-slide-in">
        <NuevoComboForm productos={productos ?? []} />
      </div>

      {lista.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center mt-6 animate-fade-slide-in">
          <p className="text-sm text-text-muted">Todavía no armaste ningún combo.</p>
        </div>
      ) : (
        <div className="mt-6 animate-fade-slide-in">
          <CombosList combos={lista as never} productos={(productos ?? []) as never} />
        </div>
      )}
    </main>
  );
}
