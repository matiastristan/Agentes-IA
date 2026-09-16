import { createServiceClient } from '@/lib/supabase/service-client';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ESTADO_COLOR: Record<string, string> = {
  activo: 'text-success bg-success-bg',
  suspendido_pago: 'text-warning bg-warning-bg',
  baja_definitiva: 'text-error bg-error-bg',
};

export default async function AdminNegociosPage() {
  const supabase = createServiceClient();
  const { data: negocios } = await supabase
    .from('negocio')
    .select('tenant_id, nombre, tipo_crm, rubro, tier, estado_cuenta')
    .order('created_at', { ascending: false });

  const lista = negocios ?? [];

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">
        Negocios
      </h1>

      {lista.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center animate-fade-slide-in">
          <p className="text-sm text-text-muted">Todavía no hay negocios registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((n, i) => (
            <a
              key={n.tenant_id}
              href={`/admin/negocios/${n.tenant_id}`}
              className="animate-fade-slide-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Card className="transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <CardTitle>{n.nombre}</CardTitle>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full capitalize',
                      ESTADO_COLOR[n.estado_cuenta] ?? 'text-text-secondary bg-bg-tint'
                    )}
                  >
                    {n.estado_cuenta.replace(/_/g, ' ')}
                  </span>
                </div>
                <CardContent>
                  <p className="text-sm text-text-secondary capitalize">
                    {n.tipo_crm} · {n.rubro?.replace(/_/g, ' ')} · plan {n.tier}
                  </p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
