import { horaDentroDeRango } from './hora-dentro-de-rango';
import { expandirRangoAHoras } from '../agent/expandir-rango-a-horas';

interface Recurso {
  id: string;
  nombre: string;
  subtipo: string | null;
}

interface Cita {
  id: string;
  estado?: string;
  recurso_id: string | null;
  hora: string;
  customer_name: string | null;
  customer_id: string;
  servicio: { duracion_minutos: number; precio: number } | null;
}

interface Abono {
  id: string;
  recurso_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  precio: number;
}

interface TurnoInfo {
  tipo: 'cita' | 'abono';
  estado?: string;
  id: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  precio: number;
  horaFin: string;
}

interface HoraSlot {
  hora: string;
  ocupado: boolean;
  turno: TurnoInfo | null;
}

interface RecursoConSlots {
  recurso: Recurso;
  horas: HoraSlot[];
}

interface BuildCalendarioSlotsInput {
  fecha: string;
  diaSemana: number;
  horarioDelDia: string | undefined; // ej. "17:00-20:00", o undefined si está cerrado
  recursos: Recurso[];
  subtipoFiltro: string | null;
  citas: Cita[];
  abonos: Abono[];
}

function generarHorasEnRango(rango: string | undefined): string[] {
  if (!rango || !rango.includes('-')) return [];
  const [inicio, fin] = rango.split('-');
  // Misma regla que usa el agente: calendario y WhatsApp siempre coinciden.
  return expandirRangoAHoras(inicio, fin);
}

function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number);
  const totalMin = h * 60 + m + minutos;
  const hFin = Math.floor(totalMin / 60) % 24;
  const mFin = totalMin % 60;
  return `${String(hFin).padStart(2, '0')}:${String(mFin).padStart(2, '0')}`;
}

export function buildCalendarioSlots(input: BuildCalendarioSlotsInput): RecursoConSlots[] {
  const { horarioDelDia, recursos, subtipoFiltro, citas, abonos, diaSemana } = input;

  const recursosFiltrados = subtipoFiltro
    ? recursos.filter((r) => r.subtipo === subtipoFiltro)
    : recursos;

  const horasBase = generarHorasEnRango(horarioDelDia);

  return recursosFiltrados.map((recurso) => {
    const horas: HoraSlot[] = horasBase.map((hora) => {
      const cita = citas.find((c) => c.recurso_id === recurso.id && c.hora.slice(0, 5) === hora);
      if (cita) {
        return {
          hora,
          ocupado: true,
          turno: {
            tipo: 'cita',
            estado: cita.estado,
            id: cita.id,
            clienteNombre: cita.customer_name ?? 'Sin nombre',
            clienteTelefono: cita.customer_id,
            precio: cita.servicio?.precio ?? 0,
            horaFin: sumarMinutos(hora, cita.servicio?.duracion_minutos ?? 60),
          },
        };
      }

      const abono = abonos.find(
        (a) =>
          a.recurso_id === recurso.id &&
          a.dia_semana === diaSemana &&
          horaDentroDeRango(hora, a.hora_inicio, a.hora_fin)
      );
      if (abono) {
        return {
          hora,
          ocupado: true,
          turno: {
            tipo: 'abono',
            id: abono.id,
            clienteNombre: abono.cliente_nombre,
            clienteTelefono: abono.cliente_telefono,
            precio: abono.precio,
            horaFin: abono.hora_fin.slice(0, 5),
          },
        };
      }

      return { hora, ocupado: false, turno: null };
    });

    return { recurso, horas };
  });
}
