interface WaitlistEntry {
  id: string;
  servicio_id: string;
  recurso_id: string | null;
  estado: string;
  created_at: string;
  franja_horaria_deseada: { fecha: string; hora_desde: string; hora_hasta: string };
}

interface CanceledCita {
  servicio_id: string;
  recurso_id: string;
  fecha: string;
  hora: string;
}

export function findNextWaitlistCandidate(
  entries: WaitlistEntry[],
  canceled: CanceledCita
): WaitlistEntry | null {
  const candidates = entries
    .filter((e) => e.estado === 'esperando')
    .filter((e) => e.servicio_id === canceled.servicio_id)
    .filter((e) => e.recurso_id === null || e.recurso_id === canceled.recurso_id)
    .filter((e) => e.franja_horaria_deseada.fecha === canceled.fecha)
    .filter(
      (e) =>
        canceled.hora >= e.franja_horaria_deseada.hora_desde &&
        canceled.hora <= e.franja_horaria_deseada.hora_hasta
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return candidates[0] ?? null;
}
