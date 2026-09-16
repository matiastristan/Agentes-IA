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

  const lista = servicios ?? [];

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">
        Servicios
      </h1>

      {lista.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center animate-fade-slide-in">
          <p className="text-sm text-text-muted">Todavía no cargaste ningún servicio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((s, i) => (
            <div key={s.id} className="animate-fade-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
              <Card className="transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle>{s.nombre}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-secondary">
                    {s.duracion_minutos} min · ${s.precio}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
