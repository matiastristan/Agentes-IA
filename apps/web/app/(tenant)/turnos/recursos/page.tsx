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

  const puedeAgregarMas =
    (recursos?.length ?? 0) === 0 ||
    hasFeature(negocio!.tier as 'base' | 'pro' | 'premium', overrides ?? [], 'multi_recurso');

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Recursos</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {(recursos ?? []).map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle>{r.nombre}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      {!puedeAgregarMas && (
        <p className="text-sm text-warning">
          Ya tenés un recurso cargado. Para agregar más (multi-recurso), contactá a soporte para
          habilitar el upgrade.
        </p>
      )}
    </main>
  );
}
