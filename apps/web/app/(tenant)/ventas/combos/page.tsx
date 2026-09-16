import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { NuevoComboForm } from '@/components/ventas/nuevo-combo-form';

export default async function CombosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: productos }, { data: combos }] = await Promise.all([
    supabase.from('productos').select('id, nombre').eq('tenant_id', user!.id).eq('activo', true),
    supabase.from('combos').select('*').eq('tenant_id', user!.id).eq('activo', true),
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {lista.map((c, i) => (
            <div key={c.id} className="animate-fade-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
              <Card className="transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle>{c.nombre}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-secondary">${c.precio}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
