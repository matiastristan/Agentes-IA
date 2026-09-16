import { createClient } from '@/lib/supabase/server';
import { checkReminderGuardrail } from '@/lib/turnos/reminder-guardrail';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function ConfiguracionTurnosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: negocio }, { data: reglas }] = await Promise.all([
    supabase.from('negocio').select('plantillas_meta_habilitadas').eq('tenant_id', user!.id).single(),
    supabase.from('recordatorios_config').select('*').eq('tenant_id', user!.id),
  ]);

  const lista = reglas ?? [];

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">
        Recordatorios
      </h1>

      {lista.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center animate-fade-slide-in">
          <p className="text-sm text-text-muted">Todavía no configuraste ningún recordatorio.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((r, i) => {
            const guardrail = checkReminderGuardrail(
              r.minutos_antes,
              negocio!.plantillas_meta_habilitadas
            );
            return (
              <div key={r.id} className="animate-fade-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                <Card>
                  <CardHeader>
                    <CardTitle>{r.minutos_antes} minutos antes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {guardrail.requiereAlerta && (
                      <p className="text-sm text-warning">⚠️ {guardrail.motivo}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
