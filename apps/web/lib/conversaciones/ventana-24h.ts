const VENTANA_MS = 24 * 60 * 60 * 1000;

export type EstadoVentana = { abierta: true; horasRestantes: number } | { abierta: false };

/**
 * WhatsApp solo permite mandar texto libre dentro de las 24 horas posteriores
 * al ÚLTIMO mensaje del cliente. Fuera de esa ventana, Meta rechaza el envío
 * (hace falta una plantilla aprobada). El panel usa esto para avisar antes de
 * que el dueño escriba algo que no va a llegar.
 */
export function estadoVentana24h(
  ultimoMensajeClienteISO: string | null,
  ahora: Date = new Date()
): EstadoVentana {
  if (!ultimoMensajeClienteISO) return { abierta: false };
  const transcurrido = ahora.getTime() - new Date(ultimoMensajeClienteISO).getTime();
  if (Number.isNaN(transcurrido) || transcurrido >= VENTANA_MS) return { abierta: false };
  return { abierta: true, horasRestantes: Math.floor((VENTANA_MS - transcurrido) / 3_600_000) };
}
