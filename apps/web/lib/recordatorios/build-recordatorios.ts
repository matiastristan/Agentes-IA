export interface CitaParaRecordatorio {
  id: string;
  hora: string;
  customer_id: string;
  customer_name: string;
  recurso_id: string | null;
  recurso_nombre: string;
  estado: string;
}

export interface AbonoParaRecordatorio {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  hora_inicio: string;
  hora_fin: string;
  recurso_nombre: string;
}

export interface Recordatorio {
  citaId?: string;
  abonoId?: string;
  telefono: string;
  nombre: string;
  cancha: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

// Un teléfono válido es el que guardó el webhook o el alta manual. Los turnos
// viejos sin teléfono quedaron con este marcador y no se les puede avisar.
const esTelefonoValido = (t: string | null | undefined) => !!t && t !== 'sin-telefono' && /\d{6,}/.test(t);

const hhmm = (h: string) => h.slice(0, 5);
const sumarUnaHora = (h: string) => `${String((Number(h.slice(0, 2)) + 1) % 24).padStart(2, '0')}:00`;

/**
 * Arma la lista de recordatorios a enviar para una fecha.
 *
 * Agrupa las horas consecutivas de un mismo cliente en la misma cancha: una
 * reserva "de 19 a 21" son dos filas en la base, pero el cliente tiene que
 * recibir UN solo mensaje.
 */
export function buildRecordatorios({
  fecha,
  citas,
  abonos,
  citasYaEnviadas,
  abonosYaEnviados,
}: {
  fecha: string;
  citas: CitaParaRecordatorio[];
  abonos: AbonoParaRecordatorio[];
  citasYaEnviadas: string[];
  abonosYaEnviados: string[];
}): Recordatorio[] {
  const yaCitas = new Set(citasYaEnviadas);
  const yaAbonos = new Set(abonosYaEnviados);

  const activas = citas
    .filter((c) => c.estado !== 'cancelada' && esTelefonoValido(c.customer_id))
    .sort(
      (a, b) =>
        a.customer_id.localeCompare(b.customer_id) ||
        (a.recurso_id ?? '').localeCompare(b.recurso_id ?? '') ||
        a.hora.localeCompare(b.hora)
    );

  const bloques: CitaParaRecordatorio[][] = [];
  for (const c of activas) {
    const ultimo = bloques[bloques.length - 1];
    const previa = ultimo?.[ultimo.length - 1];
    const consecutiva =
      previa &&
      previa.customer_id === c.customer_id &&
      previa.recurso_id === c.recurso_id &&
      Number(c.hora.slice(0, 2)) === Number(previa.hora.slice(0, 2)) + 1;
    if (consecutiva) ultimo.push(c);
    else bloques.push([c]);
  }

  const deCitas: Recordatorio[] = bloques
    // Si cualquier hora del bloque ya se avisó, el turno entero ya fue avisado
    .filter((b) => !b.some((c) => yaCitas.has(c.id)))
    .map((b) => ({
      citaId: b[0].id,
      telefono: b[0].customer_id,
      nombre: b[0].customer_name,
      cancha: b[0].recurso_nombre,
      fecha,
      horaInicio: hhmm(b[0].hora),
      horaFin: sumarUnaHora(b[b.length - 1].hora),
    }));

  const deAbonos: Recordatorio[] = abonos
    .filter((a) => esTelefonoValido(a.cliente_telefono) && !yaAbonos.has(a.id))
    .map((a) => ({
      abonoId: a.id,
      telefono: a.cliente_telefono!,
      nombre: a.cliente_nombre,
      cancha: a.recurso_nombre,
      fecha,
      horaInicio: hhmm(a.hora_inicio),
      horaFin: hhmm(a.hora_fin),
    }));

  return [...deCitas, ...deAbonos].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
}
