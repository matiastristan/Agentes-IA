import { expandirRangoAHoras } from './expandir-rango-a-horas';

interface RecursoDisp {
  id: string;
  nombre: string;
  subtipo: string | null;
}

interface CitaDisp {
  recurso_id: string | null;
  hora: string;
  estado: string;
}

interface AbonoDisp {
  recurso_id: string | null;
  hora_inicio: string;
  hora_fin: string;
}

export interface DisponibilidadCancha {
  cancha: string;
  horasLibres: string[];
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Arma, para cada cancha, la lista de horas que realmente quedan libres ese día.
 *
 * Es la diferencia entre decirle al agente "las 20:00 están ocupadas" (¿en cuál
 * cancha?) y "la Cancha Padel 1 tiene libres las 20, 21 y 22". Sin esto, el
 * agente suma las ocupaciones de todas las canchas como si fueran una sola y
 * termina diciendo que no hay lugar cuando en realidad sí lo hay.
 */
export function buildDisponibilidadPorCancha({
  recursos,
  horario,
  citas,
  abonos,
  filtroServicio,
}: {
  recursos: RecursoDisp[];
  horario: string | undefined;
  citas: CitaDisp[];
  abonos: AbonoDisp[];
  filtroServicio?: string;
}): DisponibilidadCancha[] {
  const todasLasHoras = horario ? expandirRangoAHoras(...(horario.split('-') as [string, string])) : [];

  const candidatos = filtroServicio
    ? recursos.filter((r) => {
        const aguja = normalizar(filtroServicio);
        return (
          normalizar(r.nombre).includes(aguja) || normalizar(r.subtipo ?? '').includes(aguja)
        );
      })
    : recursos;

  return candidatos.map((recurso) => {
    const ocupadas = new Set<string>();

    for (const c of citas) {
      if (c.recurso_id !== recurso.id) continue;
      if (c.estado === 'cancelada') continue;
      ocupadas.add(c.hora.slice(0, 5));
    }

    for (const a of abonos) {
      if (a.recurso_id !== recurso.id) continue;
      for (const h of expandirRangoAHoras(a.hora_inicio, a.hora_fin)) {
        ocupadas.add(h);
      }
    }

    return {
      cancha: recurso.nombre,
      horasLibres: todasLasHoras.filter((h) => !ocupadas.has(h)),
    };
  });
}

/**
 * Los nombres de las canchas que el negocio realmente ofrece.
 *
 * Sirve para el caso en que un cliente pregunta por un deporte que no existe
 * ("¿tienen tenis?"): la respuesta correcta es decirle qué SÍ hay, no que
 * "no hay disponibilidad" — que suena a que está todo ocupado.
 */
export function serviciosDisponibles(recursos: RecursoDisp[]): string[] {
  return recursos.map((r) => r.nombre);
}
