interface ExchangeCodeResult {
  success: boolean;
  accessToken?: string;
  error?: string;
}

const GRAPH_API_VERSION = 'v21.0';

/**
 * Intercambia el `code` de un solo uso que devuelve el popup de Embedded
 * Signup por un access_token real, vía la Graph API de Meta. Este paso
 * ocurre siempre del lado del servidor — el `code` nunca debe usarse
 * directamente para llamar a la API en nombre del negocio.
 */
export async function exchangeCodeForToken(code: string): Promise<ExchangeCodeResult> {
  const url =
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token` +
    `?client_id=${process.env.META_APP_ID}` +
    `&client_secret=${process.env.META_APP_SECRET}` +
    `&code=${code}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const detail = errorBody?.error?.message ?? '';
      return {
        success: false,
        error: detail ? `Meta respondió ${response.status}: ${detail}` : `Meta respondió ${response.status}`,
      };
    }

    const json = await response.json();
    return { success: true, accessToken: json.access_token };
  } catch {
    return { success: false, error: 'Error de red al contactar la Graph API de Meta' };
  }
}
