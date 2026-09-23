import { expandirRangoAHoras } from './expandir-rango-a-horas';

const MAX_HORAS_POR_RESERVA = 4;

export type MotivoRechazo =
  | 'formato_invalido'
  | 'fecha_pasada'
  | 'hora_pasada'
  | 'cerrado'
  | 'fuera_de_horario'
  | 'ocupado';

export type PlanReserva =
  | { ok: true; horas: string[] }
  | { ok: false; motivo: MotivoRechazo; mensaje: string; horasOcupadas?: string[] };

interface Entrada {
  fecha: string;
  /** Hora de inicio tal como la manda el modelo ("19", "19:00", "19:00:00"). */
  hora: string;
  /** Cantidad de horas consecutivas. Por defecto 1. */
  cantidadHoras?: number;
  /** Horario de atención del día, ej. "17:00-23:00" (cierre exclusivo). */
  horarioDelDia: string | undefined;
  /** Turnos de ESA cancha en ESA fecha. */
  citasRecurso: Array<{ hora: string; estado: string }>;
  /** Mensualizados de ESA cancha para ese día de la semana. */
  abonosRecurso: Array<{ hora_inicio: string; hora_fin: string }>;
  /** Fecha de hoy en Argentina (YYYY-MM-DD). */
  hoy: string;
  /** Hora actual en Argentina (HH:MM). */
  horaActual: string;
}

function rechazo(
  motivo: MotivoRechazo,
  mensaje: string,
  horasOcupadas?: string[]
): PlanReserva {
  return horasOcupadas ? { ok: false, motivo, mensaje, horasOcupadas } : { ok: false, motivo, mensaje };
}

/** "19" | "19:00" | "9:00:00" -> 19 | 9. Null si no es una hora en punto válida. */
function parsearHoraEnPunto(hora: string): { hora: number } | { error: string } {
  const match = /^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?$/.exec(hora.trim());
  if (!match) return { error: `"${hora}" no es una hora válida` };
  const h = Number(match[1]);
  const m = Number(match[2] ?? '0');
  if (h > 23 || m > 59) return { error: `"${hora}" no es una hora válida` };
  if (m !== 0) return { error: 'Los turnos son de hora completa: la hora tiene que ser en punto (ej. 19:00)' };
  return { hora: h };
}

function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  // Descarta fechas como 2026-13-01 o 2026-02-31, que Date "corrige" en silencio.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

const pad = (n: number) => `${String(n).padStart(2, '0')}:00`;

/**
 * Decide si una reserva de una o varias horas consecutivas se puede hacer, y
 * devuelve exactamente qué horas reservar.
 *
 * Es "todo o nada": si cualquiera de las horas pedidas no está disponible, no se
 * reserva ninguna. Así nunca queda media reserva ni se le confirma al cliente
 * algo que no quedó registrado.
 */
export function planificarReserva(entrada: Entrada): PlanReserva {
  const cantidad = entrada.cantidadHoras ?? 1;

  // 1. Formato
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_HORAS_POR_RESERVA) {
    return rechazo(
      'formato_invalido',
      `La cantidad de horas tiene que ser un número entero entre 1 y ${MAX_HORAS_POR_RESERVA}`
    );
  }
  if (!esFechaValida(entrada.fecha)) {
    return rechazo('formato_invalido', `"${entrada.fecha}" no es una fecha válida (formato AAAA-MM-DD)`);
  }
  const parseo = parsearHoraEnPunto(entrada.hora);
  if ('error' in parseo) return rechazo('formato_invalido', parseo.error);

  // 2. Fecha pasada
  if (entrada.fecha < entrada.hoy) {
    return rechazo('fecha_pasada', 'Esa fecha ya pasó, no se puede reservar');
  }

  // 3. Horario de atención
  if (!entrada.horarioDelDia || !entrada.horarioDelDia.includes('-')) {
    return rechazo('cerrado', 'El negocio no atiende ese día');
  }
  const [apertura, cierre] = entrada.horarioDelDia.split('-');
  const horasDelDia = expandirRangoAHoras(apertura, cierre);

  const horasPedidas: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const h = parseo.hora + i;
    if (h > 23) {
      return rechazo(
        'fuera_de_horario',
        `No se puede reservar pasada la medianoche. El horario de ese día es ${entrada.horarioDelDia}`
      );
    }
    horasPedidas.push(pad(h));
  }

  const fueraDeHorario = horasPedidas.filter((h) => !horasDelDia.includes(h));
  if (fueraDeHorario.length > 0) {
    return rechazo(
      'fuera_de_horario',
      `Fuera del horario de atención (${entrada.horarioDelDia}): ${fueraDeHorario.join(', ')}`
    );
  }

  // 4. Hora pasada (solo si es hoy)
  if (entrada.fecha === entrada.hoy && aMinutos(horasPedidas[0]) < aMinutos(entrada.horaActual)) {
    return rechazo('hora_pasada', 'Ese horario de hoy ya pasó');
  }

  // 5. Ocupación: turnos activos + mensualizados de esta cancha
  const ocupadas = new Set<string>();
  for (const c of entrada.citasRecurso) {
    if (c.estado !== 'cancelada') ocupadas.add(c.hora.slice(0, 5));
  }
  for (const a of entrada.abonosRecurso) {
    for (const h of expandirRangoAHoras(a.hora_inicio, a.hora_fin)) ocupadas.add(h);
  }

  const horasOcupadas = horasPedidas.filter((h) => ocupadas.has(h));
  if (horasOcupadas.length > 0) {
    return rechazo(
      'ocupado',
      `Esa cancha ya está ocupada a las ${horasOcupadas.join(', ')}. No se reservó ninguna hora.`,
      horasOcupadas
    );
  }

  return { ok: true, horas: horasPedidas };
}
