import { createClient } from '@/lib/supabase/server';
import { checkReminderGuardrail } from '@/lib/turnos/reminder-guardrail';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function ConfiguracionTurnosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: negocio } = await supabase
    .from('negocio')
    .select('plantillas_meta_habilitadas')
    .eq('tenant_id', user!.id)
    .single();

  const { data: reglas } = await supabase
    .from('recordatorios_config')
    .select('*')
    .eq('tenant_id', user!.id);

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Recordatorios</h1>
      <div className="flex flex-col gap-3">
        {(reglas ?? []).map((r) => {
          const guardrail = checkReminderGuardrail(
            r.minutos_antes,
            negocio!.plantillas_meta_habilitadas
          );
          return (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle>{r.minutos_antes} minutos antes</CardTitle>
              </CardHeader>
              <CardContent>
                {guardrail.requiereAlerta && (
                  <p className="text-sm text-warning">⚠️ {guardrail.motivo}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
