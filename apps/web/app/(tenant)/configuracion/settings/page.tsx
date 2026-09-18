import { createClient } from '@/lib/supabase/server';
import { ConfiguracionAgenteForm } from '@/components/negocio/configuracion-agente-form';

export default async function ConfiguracionSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: negocio } = await supabase
    .from('negocio')
    .select('tono_voz, horarios, instrucciones_adicionales')
    .eq('tenant_id', user!.id)
    .single();

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-1 animate-fade-slide-in">
        Configuración del agente
      </h1>
      <p className="text-sm text-text-secondary mb-6 animate-fade-slide-in">
        Así habla y se comporta tu agente en WhatsApp.
      </p>

      <div className="animate-fade-slide-in">
        <ConfiguracionAgenteForm
          tonoVozActual={negocio?.tono_voz ?? 'casual'}
          horariosActuales={(negocio?.horarios as Record<string, string>) ?? {}}
          instruccionesActuales={negocio?.instrucciones_adicionales ?? ''}
        />
      </div>
    </main>
  );
}
