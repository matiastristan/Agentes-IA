import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { NuevoComboForm } from '@/components/ventas/nuevo-combo-form';

export default async function CombosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: productos } = await supabase
    .from('productos')
    .select('id, nombre')
    .eq('tenant_id', user!.id)
    .eq('activo', true);

  const { data: combos } = await supabase
    .from('combos')
    .select('*')
    .eq('tenant_id', user!.id)
    .eq('activo', true);

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Combos</h1>

      <NuevoComboForm productos={productos ?? []} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {(combos ?? []).map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle>{c.nombre}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">${c.precio}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
