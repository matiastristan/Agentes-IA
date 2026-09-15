interface GuardrailResult {
  requiereAlerta: boolean;
  motivo?: string;
}

const VENTANA_24HS_MINUTOS = 1440;

export function checkReminderGuardrail(
  minutosAntes: number,
  plantillasMetaHabilitadas: boolean
): GuardrailResult {
  if (minutosAntes <= VENTANA_24HS_MINUTOS) {
    return { requiereAlerta: false };
  }

  if (plantillasMetaHabilitadas) {
    return { requiereAlerta: false };
  }

  return {
    requiereAlerta: true,
    motivo:
      'Este recordatorio cae fuera de la ventana de 24hs de WhatsApp y necesita una plantilla aprobada por Meta para funcionar.',
  };
}
