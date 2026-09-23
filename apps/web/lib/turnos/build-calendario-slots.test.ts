import { describe, it, expect } from 'vitest';
import { buildCalendarioSlots } from './build-calendario-slots';

const RECURSOS = [
  { id: 'r1', nombre: 'Cancha 1 (Fútbol 5)', subtipo: 'futbol_5' },
  { id: 'r2', nombre: 'Cancha 2 (Fútbol 5)', subtipo: 'futbol_5' },
  { id: 'r3', nombre: 'Cancha 3 (Fútbol 7)', subtipo: 'futbol_7' },
];

// Viernes 18/9/2026
const FECHA = '2026-09-18';
const DIA_SEMANA = 5; // viernes

describe('buildCalendarioSlots', () => {
  it('genera un slot por hora dentro del horario de atención de ese día, para cada recurso', () => {
    const slots = buildCalendarioSlots({
      fecha: FECHA,
      diaSemana: DIA_SEMANA,
      horarioDelDia: '17:00-20:00',
      recursos: RECURSOS,
      subtipoFiltro: 'futbol_5',
      citas: [],
      abonos: [],
    });

    // Solo las 2 canchas de fútbol 5, 3 horas (17,18,19) cada una
    expect(slots).toHaveLength(2);
    expect(slots[0].recurso.id).toBe('r1');
    expect(slots[0].horas.map((h) => h.hora)).toEqual(['17:00', '18:00', '19:00']);
  });

  it('filtra por subtipo — no incluye recursos de otro tipo', () => {
    const slots = buildCalendarioSlots({
      fecha: FECHA,
      diaSemana: DIA_SEMANA,
      horarioDelDia: '17:00-19:00',
      recursos: RECURSOS,
      subtipoFiltro: 'futbol_7',
      citas: [],
      abonos: [],
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].recurso.id).toBe('r3');
  });

  it('sin horarioDelDia (negocio cerrado ese día), no genera ningún slot', () => {
    const slots = buildCalendarioSlots({
      fecha: FECHA,
      diaSemana: DIA_SEMANA,
      horarioDelDia: undefined,
      recursos: RECURSOS,
      subtipoFiltro: 'futbol_5',
      citas: [],
      abonos: [],
    });
    expect(slots.every((s) => s.horas.length === 0)).toBe(true);
  });

  it('marca un slot como ocupado por una cita puntual, con nombre y precio', () => {
    const slots = buildCalendarioSlots({
      fecha: FECHA,
      diaSemana: DIA_SEMANA,
      horarioDelDia: '17:00-19:00',
      recursos: RECURSOS,
      subtipoFiltro: 'futbol_5',
      citas: [
        {
          id: 'cita-1',
          recurso_id: 'r1',
          hora: '17:00',
          customer_name: 'Roberto',
          customer_id: '5491100000000',
          servicio: { duracion_minutos: 60, precio: 42000 },
        },
      ],
      abonos: [],
    });

    const slotOcupado = slots[0].horas.find((h) => h.hora === '17:00');
    expect(slotOcupado?.ocupado).toBe(true);
    expect(slotOcupado?.turno?.tipo).toBe('cita');
    expect(slotOcupado?.turno?.clienteNombre).toBe('Roberto');
    expect(slotOcupado?.turno?.precio).toBe(42000);
    expect(slotOcupado?.turno?.horaFin).toBe('18:00');
  });

  it('marca un slot como ocupado por un abono (cliente mensualizado) que cae ese día de la semana', () => {
    const slots = buildCalendarioSlots({
      fecha: FECHA,
      diaSemana: DIA_SEMANA,
      horarioDelDia: '17:00-19:00',
      recursos: RECURSOS,
      subtipoFiltro: 'futbol_5',
      citas: [],
      abonos: [
        {
          id: 'abono-1',
          recurso_id: 'r2',
          dia_semana: DIA_SEMANA,
          hora_inicio: '18:00',
          hora_fin: '19:00',
          cliente_nombre: 'Grupo Los Pibes',
          cliente_telefono: '5493876289131',
          precio: 40000,
        },
      ],
    });

    const slotOcupado = slots[1].horas.find((h) => h.hora === '18:00');
    expect(slotOcupado?.ocupado).toBe(true);
    expect(slotOcupado?.turno?.tipo).toBe('abono');
    expect(slotOcupado?.turno?.clienteNombre).toBe('Grupo Los Pibes');
  });

  it('un abono de OTRO día de la semana no ocupa nada ese día', () => {
    const slots = buildCalendarioSlots({
      fecha: FECHA,
      diaSemana: DIA_SEMANA,
      horarioDelDia: '17:00-19:00',
      recursos: RECURSOS,
      subtipoFiltro: 'futbol_5',
      citas: [],
      abonos: [
        {
          id: 'abono-2',
          recurso_id: 'r1',
          dia_semana: 1, // lunes, no viernes
          hora_inicio: '17:00',
          hora_fin: '18:00',
          cliente_nombre: 'Otro grupo',
          cliente_telefono: null,
          precio: 40000,
        },
      ],
    });
    const slot = slots[0].horas.find((h) => h.hora === '17:00');
    expect(slot?.ocupado).toBe(false);
  });
  it('un horario que cierra a medianoche (17:00-00:00) muestra los turnos hasta las 23 (antes no mostraba ninguno)', () => {
    const slots = buildCalendarioSlots({
      fecha: '2026-09-25',
      diaSemana: 5,
      horarioDelDia: '17:00-00:00',
      recursos: [{ id: 'r1', nombre: 'Cancha', subtipo: null }],
      subtipoFiltro: null,
      citas: [],
      abonos: [],
    } as never);
    const horas = (slots as any)[0].horas.map((h: any) => h.hora);
    expect(horas[0]).toBe('17:00');
    expect(horas[horas.length - 1]).toBe('23:00');
  });

  it('un horario hasta las 23:59 incluye el turno de las 23 (coincide con lo que ofrece el agente)', () => {
    const slots = buildCalendarioSlots({
      fecha: '2026-09-25',
      diaSemana: 5,
      horarioDelDia: '17:00-23:59',
      recursos: [{ id: 'r1', nombre: 'Cancha', subtipo: null }],
      subtipoFiltro: null,
      citas: [],
      abonos: [],
    } as never);
    const horas = (slots as any)[0].horas.map((h: any) => h.hora);
    expect(horas).toContain('23:00');
  });
});
