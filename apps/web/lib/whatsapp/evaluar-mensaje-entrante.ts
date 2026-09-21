/**
 * Decide si un mensaje entrante de WhatsApp se procesa o se descarta.
 *
 * Meta reintenta la entrega de un webhook cuando no recibe un 200 rápido, y si
 * el servidor falló, acumula esos reintentos durante horas. Sin este filtro:
 *  - el mismo mensaje se procesaba dos veces → confirmaciones duplicadas
 *  - mensajes de ayer se procesaban de madrugada → respuestas fuera de contexto
 */
const ANTIGUEDAD_MAXIMA_SEG = 10 * 60; // 10 minutos

export type DecisionMensaje = 'procesar' | 'duplicado' | 'viejo';

export function evaluarMensajeEntrante({
  timestampSeg,
  yaProcesado,
  ahora = new Date(),
}: {
  /** Campo `timestamp` del mensaje de Meta, en segundos Unix. */
  timestampSeg: number | undefined;
  /** Si ya existe un mensaje guardado con ese mismo wamid. */
  yaProcesado: boolean;
  ahora?: Date;
}): DecisionMensaje {
  if (yaProcesado) return 'duplicado';

  if (typeof timestampSeg === 'number' && Number.isFinite(timestampSeg)) {
    const antiguedad = Math.floor(ahora.getTime() / 1000) - timestampSeg;
    if (antiguedad > ANTIGUEDAD_MAXIMA_SEG) return 'viejo';
  }

  return 'procesar';
}
