import { createClient } from '@/lib/supabase/server';
import { AparienciaForm } from '@/components/negocio/apariencia-form';

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

      <div className="animate-fade-slide-in">
        <AparienciaForm colorPaletteActual={negocio?.color_palette ?? 'apple'} />
      </div>
    </main>
  );
}
