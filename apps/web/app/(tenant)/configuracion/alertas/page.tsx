import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmailAlertasForm } from '@/components/negocio/email-alertas-form';

export default async function ConfiguracionAlertasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: negocio } = await supabase
    .from('negocio')
    .select('email_alertas')
    .eq('tenant_id', user!.id)
    .single();

  const { data: override } = await supabase
    .from('negocio_feature_overrides')
    .select('habilitado')
    .eq('tenant_id', user!.id)
    .eq('feature_key', 'alertas_lead_caliente')
    .single();

  const habilitada = override?.habilitado ?? false;

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">Alertas de leads calientes</h1>

      {!habilitada ? (
        <Card className="animate-fade-slide-in">
          <CardContent>
            <p className="text-sm text-text-secondary py-4">
              Esta función todavía no está activada en tu plan. Contactá a soporte
              si querés recibir un email automático cuando un cliente muestra
              intención clara de compra.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-fade-slide-in">
          <CardHeader>
            <CardTitle>Tu email de notificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary mb-4">
              Cuando un cliente muestra alta intención de compra en una conversación,
              te avisamos acá.
            </p>
            <EmailAlertasForm emailActual={negocio?.email_alertas ?? null} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
