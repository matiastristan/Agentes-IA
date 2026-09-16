interface ShouldTriggerLeadAlertParams {
  temperatura: 'frio' | 'moderado' | 'caliente';
  cantidadMensajesUsuario: number;
  featureHabilitada: boolean;
}

const UMBRAL_MENSAJES = 3;

export function shouldTriggerLeadAlert({
  temperatura,
  cantidadMensajesUsuario,
  featureHabilitada,
}: ShouldTriggerLeadAlertParams): boolean {
  return (
    featureHabilitada && temperatura === 'caliente' && cantidadMensajesUsuario >= UMBRAL_MENSAJES
  );
}
