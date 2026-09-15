import { createServiceClient } from '@/lib/supabase/service-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function AdminNegociosPage() {
  const supabase = createServiceClient();
  const { data: negocios } = await supabase
    .from('negocio')
    .select('tenant_id, nombre, tipo_crm, rubro, tier, estado_cuenta')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Negocios</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(negocios ?? []).map((n) => (
          <a key={n.tenant_id} href={`/admin/negocios/${n.tenant_id}`}>
            <Card>
              <CardHeader>
                <CardTitle>{n.nombre}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">
                  {n.tipo_crm} · {n.rubro} · {n.tier} · {n.estado_cuenta}
                </p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </main>
  );
}
