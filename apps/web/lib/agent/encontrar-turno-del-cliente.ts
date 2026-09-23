interface FilaCita {
  id: string;
  hora: string;
  recurso_id: string | null;
  servicio_id: string | null;
  customer_name: string;
}

export interface TurnoDelCliente {
  ids: string[];
  horas: string[]; // HH:MM, ordenadas
  recurso_id: string | null;
  servicio_id: string | null;
  customer_name: string;
}

export type BusquedaTurno =
  | { ok: true; turno: TurnoDelCliente }
  | { ok: false; motivo: 'no_encontrado' }
  | { ok: false; motivo: 'ambiguo'; opciones: string[][] };

const aHora = (h: string) => Number(h.slice(0, 2));

function normalizarHora(h: string): string | null {
  const m = /^(\d{1,2})(?::\d{2})?(?::\d{2})?$/.exec(h.trim());
  return m ? `${m[1].padStart(2, '0')}:00` : null;
}

/**
 * Encuentra un turno del cliente en un día, entendido como BLOQUE: todas las
 * horas consecutivas en la misma cancha. Una reserva "de 19 a 21" son dos filas
 * en la base, pero para el cliente es un solo turno: cancelarlo o moverlo tiene
 * que afectar a las dos.
 *
 * `citasDelDia` tienen que ser solo las del cliente (filtradas por su teléfono)
 * y activas (no canceladas).
 */
export function encontrarTurnoDelCliente(citasDelDia: FilaCita[], horaPedida?: string): BusquedaTurno {
  const ordenadas = [...citasDelDia].sort(
    (a, b) => (a.recurso_id ?? '').localeCompare(b.recurso_id ?? '') || a.hora.localeCompare(b.hora)
  );

  const bloques: FilaCita[][] = [];
  for (const c of ordenadas) {
    const ultimo = bloques[bloques.length - 1];
    const previa = ultimo?.[ultimo.length - 1];
    if (previa && previa.recurso_id === c.recurso_id && aHora(c.hora) === aHora(previa.hora) + 1) {
      ultimo.push(c);
    } else {
      bloques.push([c]);
    }
  }
  // Orden final por hora de inicio, para mostrar las opciones de forma natural
  bloques.sort((a, b) => a[0].hora.localeCompare(b[0].hora));

  const aTurno = (b: FilaCita[]): TurnoDelCliente => ({
    ids: b.map((c) => c.id),
    horas: b.map((c) => c.hora.slice(0, 5)),
    recurso_id: b[0].recurso_id,
    servicio_id: b[0].servicio_id,
    customer_name: b[0].customer_name,
  });

  if (horaPedida !== undefined && horaPedida !== '') {
    const h = normalizarHora(horaPedida);
    const bloque = h ? bloques.find((b) => b.some((c) => c.hora.slice(0, 5) === h)) : undefined;
    return bloque ? { ok: true, turno: aTurno(bloque) } : { ok: false, motivo: 'no_encontrado' };
  }

  if (bloques.length === 0) return { ok: false, motivo: 'no_encontrado' };
  if (bloques.length === 1) return { ok: true, turno: aTurno(bloques[0]) };
  return { ok: false, motivo: 'ambiguo', opciones: bloques.map((b) => b.map((c) => c.hora.slice(0, 5))) };
}
