import { createClient } from '@/lib/supabase/server';
import { KPICard } from '@/components/ui/kpi-card';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: negocio } = await supabase
    .from('negocio')
    .select('nombre, tier, meta_connection_status')
    .eq('tenant_id', user!.id)
    .single();

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-1">
        {negocio?.nombre ?? 'Tu negocio'}
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        Plan {negocio?.tier ?? 'base'} · WhatsApp{' '}
        {negocio?.meta_connection_status === 'connected' ? 'conectado' : 'no conectado'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard label="Mensajes hoy" value={0} />
        <KPICard label="Conversiones" value={0} />
        <KPICard label="Clientes nuevos" value={0} />
      </div>
    </main>
  );
}
