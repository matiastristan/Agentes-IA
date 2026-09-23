/**
 * Convierte un rango horario en la lista de turnos de una hora que entran en él.
 * El fin es exclusivo: 18:00 a 20:00 -> ['18:00', '19:00'].
 *
 * Es la ÚNICA regla del sistema para esto: la usan el calendario, la
 * disponibilidad que ve el agente, las reservas y los mensualizados. Antes el
 * calendario tenía su propia copia y mostraba turnos distintos a los que
 * ofrecía el agente.
 *
 * Casos especiales:
 * - Fin 00:00 = hasta medianoche: 22:00 a 00:00 -> ['22:00', '23:00'].
 * - Fin XX:59 = hasta el final de esa hora: 17:00 a 23:59 incluye las 23:00
 *   (es como se suele cargar "cierra a medianoche").
 * - Fin a media hora (20:30): el turno de las 20 no entra, se pasaría del cierre.
 */
export function expandirRangoAHoras(horaInicio: string, horaFin: string): string[] {
  const [hIni] = horaInicio.split(':').map(Number);
  const [hFinBase, mFin = 0] = horaFin.split(':').map(Number);

  let hFin = mFin >= 59 ? hFinBase + 1 : hFinBase;

  // 00:00 (o cualquier fin <= inicio) significa que el rango cruza la medianoche
  if (hFin <= hIni) hFin += 24;

  const horas: string[] = [];
  for (let h = hIni; h < hFin; h++) {
    horas.push(`${String(h % 24).padStart(2, '0')}:00`);
  }
  return horas;
}
