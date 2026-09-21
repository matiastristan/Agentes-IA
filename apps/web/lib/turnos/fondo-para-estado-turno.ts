/**
 * Color de fondo de la tarjeta del calendario según el estado del turno.
 *
 * - Cuenta cerrada (completada) → verde suave: el turno terminó y se cobró.
 * - No-show → rojo suave: el cliente no vino.
 * - Mensualizado (abono) → tinte propio, para distinguirlo de un turno suelto.
 * - Resto → el tinte neutro de la paleta activa.
 */
export function fondoParaEstadoTurno(
  tipo: 'cita' | 'abono',
  estado: string | undefined
): string {
  if (tipo === 'abono') {
    // Un abono es una plantilla recurrente: no se cierra ni se marca no-show,
    // así que su estado nunca cambia el fondo.
    return 'bg-secondary/20 border-secondary/40';
  }

  if (estado === 'completada') return 'bg-success-bg border-success/40';
  if (estado === 'no_show') return 'bg-error-bg border-error/40';

  return 'bg-primary-tint/40 border-primary-tint';
}
