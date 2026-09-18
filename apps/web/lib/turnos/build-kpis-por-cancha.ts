interface HoraSlot {
  hora: string;
  ocupado: boolean;
  turno: { tipo: 'cita' | 'abono'; id: string } | null;
}

interface RecursoConSlots {
  recurso: { id: string; nombre: string; subtipo: string | null };
  horas: HoraSlot[];
}

interface CitaConEstado {
  recurso_id: string | null;
  estado: string;
}

interface KpiCancha {
  recursoId: string;
  recursoNombre: string;
  turnosTotal: number;
  turnosDisponibles: number;
  noShow: number;
}

export function buildKpisPorCancha(
  slots: RecursoConSlots[],
  citasDelDia: CitaConEstado[]
): KpiCancha[] {
  return slots.map((s) => ({
    recursoId: s.recurso.id,
    recursoNombre: s.recurso.nombre,
    turnosTotal: s.horas.filter((h) => h.ocupado).length,
    turnosDisponibles: s.horas.filter((h) => !h.ocupado).length,
    noShow: citasDelDia.filter((c) => c.recurso_id === s.recurso.id && c.estado === 'no_show').length,
  }));
}
