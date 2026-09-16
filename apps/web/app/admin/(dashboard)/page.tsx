import { createServiceClient } from '@/lib/supabase/service-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { KPICard } from '@/components/ui/kpi-card';

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
          { label: 'Negocios activos', value: totalActivos ?? 0 },
          { label: 'Por vencer (7 días)', value: porVencer?.length ?? 0 },
        ].map((kpi, i) => (
          <div
            key={kpi.label}
            className="animate-fade-slide-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <KPICard label={kpi.label} value={kpi.value} />
          </div>
        ))}
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
