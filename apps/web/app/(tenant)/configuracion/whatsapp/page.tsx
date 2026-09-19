import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ConectarWhatsAppButton } from '@/components/negocio/conectar-whatsapp-button';

export const dynamic = 'force-dynamic';

export default async function ConfiguracionWhatsAppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: negocio } = await supabase
    .from('negocio')
    .select('meta_connection_status, phone_number_id')
    .eq('tenant_id', user!.id)
    .single();

  const conectado = negocio?.meta_connection_status === 'connected';

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">WhatsApp</h1>

      <Card className="animate-fade-slide-in">
        <CardHeader>
          <CardTitle>Estado de la conexión</CardTitle>
        </CardHeader>
        <CardContent>
          {conectado ? (
            <p className="text-sm text-primary font-medium">
              ✅ Conectado — tu agente ya puede responder mensajes de WhatsApp
            </p>
          ) : (
            <>
              <p className="text-sm text-text-secondary mb-4">
                Todavía no conectaste tu número de WhatsApp Business. Hacé click abajo
                para vincularlo — vas a poder elegir el número de tu negocio sin salir
                de acá.
              </p>
              <ConectarWhatsAppButton />
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
