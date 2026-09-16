interface SendMessageParams {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
}

interface SendMessageResult {
  success: boolean;
  error?: string;
  wamid?: string;
}

export async function sendWhatsAppMessage({
  phoneNumberId,
  accessToken,
  to,
  text,
}: SendMessageParams): Promise<SendMessageResult> {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        text: { body: text },
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errorBody = await response.json();
        detail = errorBody?.error?.message ?? '';
      } catch {
        // el body no era JSON parseable, seguimos solo con el status
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
