import { createServiceClient } from '@/lib/supabase/service-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function AdminNegocioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: negocio } = await supabase.from('negocio').select('*').eq('tenant_id', id).single();
  const { data: overrides } = await supabase
    .from('negocio_feature_overrides')
    .select('*')
    .eq('tenant_id', id);
  const { data: facturacion } = await supabase
    .from('facturacion_negocio')
    .select('*')
    .eq('tenant_id', id)
    .order('fecha', { ascending: false });

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">{negocio?.nombre}</h1>

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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Features activadas puntualmente</CardTitle>
        </CardHeader>
        <CardContent>
          {(overrides ?? []).length === 0 && (
            <p className="text-sm text-text-muted">Sin overrides activos.</p>
          )}
          {(overrides ?? []).map((o) => (
            <p key={o.id} className="text-sm">
              {o.feature_key}: {o.habilitado ? 'activado' : 'desactivado'}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de facturación</CardTitle>
        </CardHeader>
        <CardContent>
          {(facturacion ?? []).map((f) => (
            <p key={f.id} className="text-sm">
              {f.fecha} — {f.concepto}: ${f.monto}
            </p>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
