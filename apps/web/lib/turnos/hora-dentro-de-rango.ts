function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m ?? 0);
}

/**
 * ¿La hora del slot cae dentro del rango [inicio, fin)?
 *
 * El fin es EXCLUSIVO: un abono de 18:00 a 20:00 ocupa los slots de 18 y 19,
 * y deja libre el de las 20. Así es como lo entiende el dueño del negocio
 * ("lo tengo tomado de 6 a 8") y como funciona en la práctica.
 *
 * Soporta rangos que cruzan medianoche (22:00 a 00:00 ocupa 22 y 23).
 */
export function horaDentroDeRango(hora: string, horaInicio: string, horaFin: string): boolean {
  const slot = aMinutos(hora);
  const inicio = aMinutos(horaInicio);
  let fin = aMinutos(horaFin);

  // 00:00 como hora de fin significa "hasta el final del día"
  if (fin <= inicio) fin += 24 * 60;

  if (slot >= inicio && slot < fin) return true;

  // Para rangos que cruzan medianoche, el slot de la madrugada también cuenta
  const slotDiaSiguiente = slot + 24 * 60;
  return slotDiaSiguiente >= inicio && slotDiaSiguiente < fin;
}
