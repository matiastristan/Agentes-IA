interface SendMessageParams {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
}

interface SendMessageResult {
  success: boolean;
  error?: string;
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
      return { success: false, error: `Meta respondió ${response.status}` };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Error de red al contactar la Graph API de Meta' };
  }
}
