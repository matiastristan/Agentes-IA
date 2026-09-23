import { estadoVentana24h } from './ventana-24h';

// Límite de largo de un mensaje de texto en la API de WhatsApp.
const MAX_CARACTERES = 4096;

// Marca en messages.tool_called para distinguir lo que escribió el dueño de lo
// que respondió el bot (el panel lo muestra distinto).
export const MARCA_ENVIO_MANUAL = 'envio_manual';

export type ResultadoEnvioManual =
  | { ok: true; wamid?: string }
  | {
      ok: false;
      codigo: 'texto_invalido' | 'no_encontrada' | 'ventana_cerrada' | 'sin_credenciales' | 'envio_fallido';
      error: string;
    };

interface Deps {
  /** Debe filtrar por el negocio del usuario logueado: null si no es suya. */
  cargarConversacion: (id: string) => Promise<{ id: string; phone_from: string } | null>;
  ultimoMensajeClienteFecha: (conversationId: string) => Promise<string | null>;
  cargarCredenciales: () => Promise<{ phone_number_id: string; access_token: string } | null>;
  enviar: (p: { phoneNumberId: string; accessToken: string; to: string; text: string }) => Promise<{
    success: boolean;
    wamid?: string;
    error?: string;
  }>;
  guardarMensaje: (m: {
    conversationId: string;
    content: string;
    toolCalled: string;
    wamid?: string;
    status: 'sent' | 'failed';
    statusError?: string;
  }) => Promise<void>;
  pausarBot: (conversationId: string) => Promise<void>;
  ahora?: Date;
}

/**
 * El dueño le escribe al cliente desde el panel.
 *
 * Si el envío sale bien, el bot se pausa en esa conversación: si no, el bot
 * podría contestarle al cliente encima de la respuesta humana.
 */
export async function enviarMensajeManual(
  { conversationId, texto }: { conversationId: string; texto: string },
  deps: Deps
): Promise<ResultadoEnvioManual> {
  const contenido = (texto ?? '').trim();
  if (!contenido) return { ok: false, codigo: 'texto_invalido', error: 'Escribí un mensaje antes de enviar.' };
  if (contenido.length > MAX_CARACTERES) {
    return { ok: false, codigo: 'texto_invalido', error: `El mensaje supera los ${MAX_CARACTERES} caracteres.` };
  }

  const conversacion = await deps.cargarConversacion(conversationId);
  if (!conversacion) return { ok: false, codigo: 'no_encontrada', error: 'La conversación no existe.' };

  const ventana = estadoVentana24h(await deps.ultimoMensajeClienteFecha(conversationId), deps.ahora);
  if (!ventana.abierta) {
    return {
      ok: false,
      codigo: 'ventana_cerrada',
      error:
        'Pasaron más de 24 horas desde el último mensaje del cliente. WhatsApp no permite escribirle hasta que vuelva a escribir él.',
    };
  }

  const credenciales = await deps.cargarCredenciales();
  if (!credenciales?.phone_number_id || !credenciales?.access_token) {
    return { ok: false, codigo: 'sin_credenciales', error: 'Este negocio no tiene WhatsApp conectado.' };
  }

  const envio = await deps.enviar({
    phoneNumberId: credenciales.phone_number_id,
    accessToken: credenciales.access_token,
    to: conversacion.phone_from,
    text: contenido,
  });

  await deps.guardarMensaje({
    conversationId,
    content: contenido,
    toolCalled: MARCA_ENVIO_MANUAL,
    wamid: envio.wamid,
    status: envio.success ? 'sent' : 'failed',
    statusError: envio.success ? undefined : envio.error,
  });

  if (!envio.success) {
    return { ok: false, codigo: 'envio_fallido', error: envio.error ?? 'WhatsApp rechazó el mensaje.' };
  }

  await deps.pausarBot(conversationId);
  return { ok: true, wamid: envio.wamid };
}
