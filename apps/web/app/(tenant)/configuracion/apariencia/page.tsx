import { createClient } from '@/lib/supabase/server';
import { AparienciaForm } from '@/components/negocio/apariencia-form';
import { ThemeToggle } from '@/components/negocio/theme-toggle';

export const dynamic = 'force-dynamic';

export default async function AparienciaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: negocio } = await supabase
    .from('negocio')
    .select('color_palette')
    .eq('tenant_id', user!.id)
    .single();

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-1 animate-fade-slide-in">
        Apariencia
      </h1>
      <p className="text-sm text-text-secondary mb-6 animate-fade-slide-in">
        Así se ve tu panel — esto no afecta cómo responde el agente por WhatsApp.
      </p>

      <h2 className="text-sm font-semibold text-text-primary mb-3 animate-fade-slide-in">
        Paleta de colores
      </h2>
      <div className="animate-fade-slide-in mb-8">
        <AparienciaForm colorPaletteActual={negocio?.color_palette ?? 'apple'} />
      </div>

      <h2 className="text-sm font-semibold text-text-primary mb-1 animate-fade-slide-in">
        Modo oscuro
      </h2>
      <p className="text-sm text-text-secondary mb-3 animate-fade-slide-in">
        Se guarda en este dispositivo — cada persona del equipo puede elegir el suyo.
      </p>
      <div className="animate-fade-slide-in">
        <ThemeToggle />
      </div>
    </main>
  );
}
