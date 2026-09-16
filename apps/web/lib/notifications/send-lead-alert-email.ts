interface SendLeadAlertEmailParams {
  to: string;
  nombreNegocio: string;
  customerName: string;
  customerPhone: string;
}

interface SendLeadAlertEmailResult {
  success: boolean;
  error?: string;
}

export async function sendLeadAlertEmail({
  to,
  nombreNegocio,
  customerName,
  customerPhone,
}: SendLeadAlertEmailParams): Promise<SendLeadAlertEmailResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FactorIA <alertas@factoria.app>',
        to: [to],
        subject: `🔥 Lead caliente en ${nombreNegocio}`,
        html: `
          <p>Un cliente mostró alto interés en tu negocio <strong>${nombreNegocio}</strong>:</p>
          <ul>
            <li><strong>Nombre:</strong> ${customerName}</li>
            <li><strong>Teléfono:</strong> ${customerPhone}</li>
          </ul>
          <p>Te recomendamos contactarlo lo antes posible.</p>
        `,
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Resend respondió ${response.status}` };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Error de red al contactar Resend' };
  }
}
