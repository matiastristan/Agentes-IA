import type { Recordatorio } from './build-recordatorios';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function diaConFecha(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
}

/** Texto del recordatorio, usado también como base de los parámetros de la plantilla. */
export function textoRecordatorio(r: Recordatorio): string {
  return `¡Hola ${r.nombre}! Te recordamos tu turno de mañana: ${r.cancha}, ${diaConFecha(r.fecha)} de ${r.horaInicio} a ${r.horaFin}. ¡Te esperamos!`;
}

export interface ResultadoEnvio {
  success: boolean;
  wamid?: string;
  error?: string;
}

interface Deps {
  enviarPlantilla: (p: {
    to: string;
    plantilla: string;
    idioma: string;
    parametros: string[];
  }) => Promise<ResultadoEnvio>;
  enviarTexto: (p: { to: string; text: string }) => Promise<ResultadoEnvio>;
  /** ¿El cliente escribió en las últimas 24h? Define si se puede mandar texto libre. */
  ventanaAbierta: (telefono: string) => Promise<boolean>;
  /** Guarda el resultado. Devuelve false si ya existía (clave única): no se reenvía. */
  registrar: (r: {
    citaId?: string;
    abonoId?: string;
    telefono: string;
    fecha: string;
    canal: 'plantilla' | 'texto' | 'ninguno';
    status: 'enviado' | 'fallido';
    error?: string;
  }) => Promise<boolean>;
}

export interface ResumenRecordatorios {
  enviados: number;
  fallidos: number;
  omitidos: number;
  duplicados: number;
}

/**
 * Envía los recordatorios uno por uno.
 *
 * Fuera de la ventana de 24h, WhatsApp solo acepta plantillas aprobadas. Por eso:
 * plantilla si está configurada; si no, texto libre solo si el cliente escribió
 * hace menos de 24h; y si ninguna de las dos aplica, se registra como fallido
 * con el motivo (nunca se pierde en silencio).
 */
export async function enviarRecordatorios(
  recordatorios: Recordatorio[],
  config: { plantilla: string | null; idioma: string },
  deps: Deps
): Promise<ResumenRecordatorios> {
  const resumen: ResumenRecordatorios = { enviados: 0, fallidos: 0, omitidos: 0, duplicados: 0 };

  for (const r of recordatorios) {
    let canal: 'plantilla' | 'texto' | 'ninguno' = 'ninguno';
    let resultado: ResultadoEnvio;

    try {
      if (config.plantilla) {
        canal = 'plantilla';
        resultado = await deps.enviarPlantilla({
          to: r.telefono,
          plantilla: config.plantilla,
          idioma: config.idioma,
          parametros: [r.nombre, r.cancha, diaConFecha(r.fecha), `${r.horaInicio} a ${r.horaFin}`],
        });
      } else if (await deps.ventanaAbierta(r.telefono)) {
        canal = 'texto';
        resultado = await deps.enviarTexto({ to: r.telefono, text: textoRecordatorio(r) });
      } else {
        resultado = {
          success: false,
          error:
            'Sin plantilla aprobada y pasaron más de 24h desde el último mensaje del cliente: WhatsApp no permite el envío.',
        };
      }
    } catch (err) {
      resultado = { success: false, error: err instanceof Error ? err.message : 'Error inesperado' };
    }

    const registrado = await deps.registrar({
      citaId: r.citaId,
      abonoId: r.abonoId,
      telefono: r.telefono,
      fecha: r.fecha,
      canal,
      status: resultado.success ? 'enviado' : 'fallido',
      error: resultado.error,
    });

    if (!registrado) resumen.duplicados++;
    else if (resultado.success) resumen.enviados++;
    else if (canal === 'ninguno') resumen.omitidos++;
    else resumen.fallidos++;
  }

  return resumen;
}
