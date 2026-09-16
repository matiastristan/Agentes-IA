import { createServiceClient } from '@/lib/supabase/service-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AdminNegocioControls } from '@/components/admin/admin-negocio-controls';

export default async function AdminNegocioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [{ data: negocio }, { data: overrides }, { data: facturacion }] = await Promise.all([
    supabase.from('negocio').select('*').eq('tenant_id', id).single(),
    supabase.from('negocio_feature_overrides').select('*').eq('tenant_id', id),
    supabase
      .from('facturacion_negocio')
      .select('*')
      .eq('tenant_id', id)
      .order('fecha', { ascending: false }),
  ]);

  const overridesMap = Object.fromEntries(
    (overrides ?? []).map((o) => [o.feature_key, o.habilitado])
  );

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <a
        href="/admin/negocios"
        className="text-sm text-text-secondary hover:text-primary mb-3 inline-block animate-fade-slide-in"
      >
        ← Volver a negocios
      </a>
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">
        {negocio?.nombre}
      </h1>

      <div className="animate-fade-slide-in" style={{ animationDelay: '40ms' }}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Tier: {negocio?.tier} · Cuenta: {negocio?.estado_cuenta}
            </p>
            <p className="text-sm text-text-secondary">
              Vence: {negocio?.plan_fecha_vencimiento ?? 'sin definir'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="animate-fade-slide-in" style={{ animationDelay: '80ms' }}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Controles</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminNegocioControls
              tenantId={id}
              estadoCuentaActual={negocio?.estado_cuenta ?? 'activo'}
              overridesActuales={overridesMap}
              planFechaAltaActual={negocio?.plan_fecha_alta ?? null}
              planCicloActual={negocio?.plan_ciclo_facturacion ?? 'mensual'}
            />
          </CardContent>
        </Card>
      </div>

      <div className="animate-fade-slide-in" style={{ animationDelay: '120ms' }}>
        <Card>
          <CardHeader>
            <CardTitle>Historial de facturación</CardTitle>
          </CardHeader>
          <CardContent>
            {(facturacion ?? []).length === 0 ? (
              <p className="text-sm text-text-muted">Todavía no hay facturación registrada.</p>
            ) : (
              (facturacion ?? []).map((f) => (
                <p key={f.id} className="text-sm">
                  {f.fecha} — {f.concepto}: ${f.monto}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
