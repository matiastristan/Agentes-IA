import { createServiceClient } from '@/lib/supabase/service-client';

// Esta página usa service_role (sin cookies()), así que Next.js no detecta
// automáticamente que necesita datos en vivo — sin esto intenta pre-renderizarla
// como estática en build time, lo cual además sería incorrecto para datos
// sensibles de admin que nunca deben quedar cacheados.
export const dynamic = 'force-dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { KPICard } from '@/components/ui/kpi-card';
import { ConsumoIaPanel } from '@/components/admin/consumo-ia-panel';
import { FREE_MODELS } from '@/lib/agent/handle-incoming-message';

export default async function AdminDashboardPage() {
  const supabase = createServiceClient();

  const en7dias = new Date();
  en7dias.setDate(en7dias.getDate() + 7);

  const [{ data: porVencer }, { count: totalActivos }] = await Promise.all([
    supabase
      .from('negocio')
      .select('nombre, plan_fecha_vencimiento, estado_cuenta')
      .lte('plan_fecha_vencimiento', en7dias.toISOString().slice(0, 10))
      .eq('estado_cuenta', 'activo'),
    supabase.from('negocio').select('*', { count: 'exact', head: true }).eq('estado_cuenta', 'activo'),
  ]);

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">
        Panel Admin
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[
          { label: 'Negocios activos', value: totalActivos ?? 0, accent: 'primary' as const },
          { label: 'Por vencer (7 días)', value: porVencer?.length ?? 0, accent: 'caliente' as const },
        ].map((kpi, i) => (
          <div
            key={kpi.label}
            className="animate-fade-slide-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <KPICard label={kpi.label} value={kpi.value} accent={kpi.accent} />
          </div>
        ))}
      </div>

      <div className="mb-8 animate-fade-slide-in">
        <ConsumoIaPanel modelos={FREE_MODELS} />
      </div>

      <h2 className="text-lg font-medium text-text-primary mb-3">Vencimientos próximos</h2>
      <div className="flex flex-col gap-2">
        {(porVencer ?? []).length === 0 && (
          <p className="text-sm text-text-muted">Ningún negocio vence en los próximos 7 días.</p>
        )}
        {(porVencer ?? []).map((n, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>{n.nombre}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">Vence: {n.plan_fecha_vencimiento}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
