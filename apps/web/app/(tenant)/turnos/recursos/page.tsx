import { createClient } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/plans/features';
import { NuevoRecursoForm } from '@/components/turnos/nuevo-recurso-form';
import { RecursosTable } from '@/components/turnos/recursos-table';
import { NuevoComboForm } from '@/components/ventas/nuevo-combo-form';
import { CombosList } from '@/components/ventas/combos-list';

export default async function RecursosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: negocio }, { data: overrides }, { data: recursos }, { data: productos }, { data: combos }] =
    await Promise.all([
      supabase.from('negocio').select('tier').eq('tenant_id', user!.id).single(),
      supabase
        .from('negocio_feature_overrides')
        .select('feature_key, habilitado')
        .eq('tenant_id', user!.id),
      supabase.from('recursos').select('*').eq('tenant_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('productos').select('id, nombre').eq('tenant_id', user!.id).eq('activo', true),
      supabase.from('combos').select('*').eq('tenant_id', user!.id).order('created_at', { ascending: false }),
    ]);

  const lista = recursos ?? [];
  const puedeAgregarMas =
    lista.length === 0 ||
    hasFeature(negocio!.tier as 'base' | 'pro' | 'premium', overrides ?? [], 'multi_recurso');

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">
        Recursos
      </h1>

      {puedeAgregarMas && (
        <div className="animate-fade-slide-in">
          <NuevoRecursoForm />
        </div>
      )}

      {lista.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center mb-6 animate-fade-slide-in">
          <p className="text-sm text-text-muted">Todavía no cargaste ningún recurso.</p>
        </div>
      ) : (
        <div className="overflow-x-auto mb-6 animate-fade-slide-in">
          <RecursosTable recursos={lista} />
        </div>
      )}

      {!puedeAgregarMas && (
        <div className="rounded-lg border border-warning-bg bg-warning-bg/40 p-4 mb-6 animate-fade-slide-in">
          <p className="text-sm text-text-primary">
            Ya tenés un recurso cargado. Para agregar más (multi-recurso), contactá a soporte
            para habilitar el upgrade.
          </p>
        </div>
      )}

      <h2 className="text-lg font-medium text-text-primary mb-3 animate-fade-slide-in">
        Combos y promociones
      </h2>
      <div className="animate-fade-slide-in">
        <NuevoComboForm productos={productos ?? []} />
      </div>
      <div className="mt-4 animate-fade-slide-in">
        <CombosList combos={combos ?? []} />
      </div>
    </main>
  );
}
