import { normalizePhoneForSending } from './normalize-phone-for-sending';

interface SendTemplateParams {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  plantilla: string;
  idioma: string;
  /** Valores de {{1}}, {{2}}... del cuerpo de la plantilla, en orden. */
  parametros: string[];
}

interface SendTemplateResult {
  success: boolean;
  error?: string;
  wamid?: string;
}

/**
 * Envía un mensaje de plantilla aprobada.
 *
 * Es la única forma de escribirle a un cliente pasadas 24 horas desde su último
 * mensaje: el texto libre ahí es rechazado por Meta (error 131047).
 */
export async function sendWhatsAppTemplate({
  phoneNumberId,
  accessToken,
  to,
  plantilla,
  idioma,
  parametros,
}: SendTemplateParams): Promise<SendTemplateResult> {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizePhoneForSending(to),
        type: 'template',
        template: {
          name: plantilla,
          language: { code: idioma },
          components: parametros.length
            ? [{ type: 'body', parameters: parametros.map((text) => ({ type: 'text', text })) }]
            : [],
        },
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errorBody = await response.json();
        detail = errorBody?.error?.message ?? '';
      } catch {
        // el body no era JSON, seguimos solo con el status
      }
      return {
        success: false,
        error: detail ? `Meta respondió ${response.status}: ${detail}` : `Meta respondió ${response.status}`,
      };
    }

    const json = await response.json();
    return { success: true, wamid: json?.messages?.[0]?.id };
  } catch {
    return { success: false, error: 'Error de red al contactar la Graph API de Meta' };
  }
}
