const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export interface ReservaConfirmada {
  cliente: string;
  cancha: string;
  fecha: string; // YYYY-MM-DD
  horas: string[]; // ['19:00', '20:00']
  precioTotal: number;
}

/** 50000 -> "50.000" sin depender de la configuración regional del servidor. */
function formatearPrecio(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function sumarUnaHora(hhmm: string): string {
  const h = (Number(hhmm.slice(0, 2)) + 1) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

/**
 * Confirmación armada por código a partir de la reserva REAL guardada.
 *
 * Se usa cuando la reserva se concretó pero el modelo no pudo redactar la
 * respuesta (cupo agotado, error, límite de tiempo). Así el cliente nunca queda
 * sin saber que su turno quedó registrado, y los datos que recibe son exactos.
 */
export function textoConfirmacionReserva(r: ReservaConfirmada): string {
  const d = new Date(`${r.fecha}T00:00:00Z`);
  const dia = DIAS[d.getUTCDay()];
  const ddmm = `${r.fecha.slice(8, 10)}/${r.fecha.slice(5, 7)}`;

  const horario =
    r.horas.length === 1
      ? `a las ${r.horas[0]}`
      : `de ${r.horas[0]} a ${sumarUnaHora(r.horas[r.horas.length - 1])}`;

  return `¡Listo ${r.cliente}! Te dejé anotado en ${r.cancha} el ${dia} ${ddmm} ${horario}. Total: $${formatearPrecio(r.precioTotal)}. ¡Te esperamos!`;
}
