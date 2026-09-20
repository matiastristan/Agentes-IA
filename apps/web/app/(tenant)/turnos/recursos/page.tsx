import { createClient } from '@/lib/supabase/server';
import { NuevoComboForm } from '@/components/ventas/nuevo-combo-form';
import { CombosList } from '@/components/ventas/combos-list';

export const dynamic = 'force-dynamic';

export default async function CombosPromocionesPage() {
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
    supabase
      .from('combos')
      .select('id, nombre, productos_incluidos, precio, activo')
      .eq('tenant_id', user!.id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-1 animate-fade-slide-in">
        Combos y promociones
      </h1>
      <p className="text-sm text-text-secondary mb-6 animate-fade-slide-in">
        Armá combos con productos de tu stock. Los que estén activos aparecen en el menú de
        consumos del calendario junto a los productos individuales.
      </p>

      {(productos ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center animate-fade-slide-in">
          <p className="text-sm text-text-muted">
            Todavía no cargaste stock. Andá a Configuración → Stock para empezar.
          </p>
        </div>
      ) : (
        <>
          <div className="animate-fade-slide-in">
            <NuevoComboForm productos={productos ?? []} />
          </div>

          <div className="mt-6 animate-fade-slide-in">
            <CombosList combos={(combos ?? []) as never} productos={(productos ?? []) as never} />
          </div>
        </>
      )}
    </main>
  );
}
