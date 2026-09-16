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

  const conectado = negocio?.meta_connection_status === 'connected';

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <div className="animate-fade-slide-in">
        <h1 className="text-2xl font-semibold text-text-primary mb-1">
          Hola, {negocio?.nombre ?? 'tu negocio'} 👋
        </h1>
        <p className="text-sm text-text-secondary mb-6 flex items-center gap-2">
          Plan <span className="font-medium capitalize">{negocio?.tier ?? 'base'}</span>
          <span className="text-border">·</span>
          <span
            className={
              'inline-flex items-center gap-1.5 ' + (conectado ? 'text-success' : 'text-warning')
            }
          >
            <span
              aria-hidden
              className={
                'h-1.5 w-1.5 rounded-full ' + (conectado ? 'bg-success' : 'bg-warning')
              }
            />
            WhatsApp {conectado ? 'conectado' : 'no conectado'}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Mensajes hoy', value: 0 },
          { label: 'Conversiones', value: 0 },
          { label: 'Clientes nuevos', value: 0 },
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

      {!conectado && (
        <div className="mt-6 rounded-lg border border-warning-bg bg-warning-bg/40 p-4 animate-fade-slide-in">
          <p className="text-sm text-text-primary font-medium mb-1">
            Todavía no conectaste WhatsApp
          </p>
          <p className="text-sm text-text-secondary mb-3">
            Conectalo para que tu agente empiece a responder mensajes.
          </p>
          <a
            href="/configuracion/whatsapp"
            className="text-sm font-medium text-primary hover:underline"
          >
            Conectar ahora →
          </a>
        </div>
      )}
    </main>
  );
}
