/**
 * Convierte el rango de un abono (18:00 a 20:00) en la lista de horas que
 * realmente ocupa: ['18:00', '19:00']. El fin es exclusivo.
 *
 * Sin esto, el agente solo veía la hora de inicio como ocupada y ofrecía
 * las horas intermedias de un abono de varias horas como si estuvieran libres.
 */
export function expandirRangoAHoras(horaInicio: string, horaFin: string): string[] {
  const [hIni] = horaInicio.split(':').map(Number);
  let [hFin] = horaFin.split(':').map(Number);

  // 00:00 como fin significa "hasta el final del día"
  if (hFin <= hIni) hFin += 24;

  const horas: string[] = [];
  for (let h = hIni; h < hFin; h++) {
    horas.push(`${String(h % 24).padStart(2, '0')}:00`);
  }
  return horas;
}
