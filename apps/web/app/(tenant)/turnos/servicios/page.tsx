import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Servicios</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(servicios ?? []).map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle>{s.nombre}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">
                {s.duracion_minutos} min · ${s.precio}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
