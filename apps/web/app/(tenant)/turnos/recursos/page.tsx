import { createClient } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/plans/features';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RecursosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: negocio } = await supabase
    .from('negocio')
    .select('tier')
    .eq('tenant_id', user!.id)
    .single();

  const { data: overrides } = await supabase
    .from('negocio_feature_overrides')
    .select('feature_key, habilitado')
    .eq('tenant_id', user!.id);

  const { data: recursos } = await supabase
    .from('recursos')
    .select('*')
    .eq('tenant_id', user!.id)
    .eq('activo', true);

  const lista = recursos ?? [];
  const puedeAgregarMas =
    lista.length === 0 ||
    hasFeature(negocio!.tier as 'base' | 'pro' | 'premium', overrides ?? [], 'multi_recurso');

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">
        Recursos
      </h1>

      {lista.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center mb-6 animate-fade-slide-in">
          <p className="text-sm text-text-muted">Todavía no cargaste ningún recurso.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {lista.map((r, i) => (
            <div key={r.id} className="animate-fade-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
              <Card className="transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle>{r.nombre}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          ))}
        </div>
      )}

      {!puedeAgregarMas && (
        <div className="rounded-lg border border-warning-bg bg-warning-bg/40 p-4 animate-fade-slide-in">
          <p className="text-sm text-text-primary">
            Ya tenés un recurso cargado. Para agregar más (multi-recurso), contactá a soporte
            para habilitar el upgrade.
          </p>
        </div>
      )}
    </main>
  );
}
