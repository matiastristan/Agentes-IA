interface CitaFacturable {
  id: string;
  recurso_id: string | null;
  estado: string;
  precioServicio: number;
}

interface ConsumoFacturable {
  cita_id: string | null;
  abono_id: string | null;
  precio: number;
}

interface FacturacionResumen {
  total: number;
  porCancha: Record<string, number>;
  cantidadTurnos: number;
}

export function buildFacturacionResumen({
  citas,
  consumos,
}: {
  citas: CitaFacturable[];
  consumos: ConsumoFacturable[];
}): FacturacionResumen {
  const citasCompletadas = citas.filter((c) => c.estado === 'completada');

  let total = 0;
  const porCancha: Record<string, number> = {};

  for (const cita of citasCompletadas) {
    const consumosDeEstaCita = consumos
      .filter((c) => c.cita_id === cita.id)
      .reduce((acc, c) => acc + c.precio, 0);
    const totalCita = cita.precioServicio + consumosDeEstaCita;

    total += totalCita;
    if (cita.recurso_id) {
      porCancha[cita.recurso_id] = (porCancha[cita.recurso_id] ?? 0) + totalCita;
    }
  }

  return { total, porCancha, cantidadTurnos: citasCompletadas.length };
}
