import { describe, it, expect } from 'vitest';
import {
  buildDisponibilidadPorCancha,
  serviciosDisponibles,
  formatearDisponibilidad,
} from './build-disponibilidad-por-cancha';

const RECURSOS = [
  { id: 'p1', nombre: 'Cancha Padel 1', subtipo: 'Padel_1' },
  { id: 'p2', nombre: 'Cancha Padel 2', subtipo: 'Padel_2' },
  { id: 'f5', nombre: 'Fútbol 5', subtipo: 'futbol_5' },
];

describe('buildDisponibilidadPorCancha', () => {
  it('devuelve una entrada por cada cancha, con su nombre', () => {
    const r = buildDisponibilidadPorCancha({
      recursos: RECURSOS,
      horario: '17:00-20:00',
      citas: [],
      abonos: [],
    });
    expect(r.map((c) => c.cancha)).toEqual(['Cancha Padel 1', 'Cancha Padel 2', 'Fútbol 5']);
  });

  it('con el horario 17-20, cada cancha libre ofrece 17, 18 y 19', () => {
    const r = buildDisponibilidadPorCancha({
      recursos: RECURSOS,
      horario: '17:00-20:00',
      citas: [],
      abonos: [],
    });
    expect(r[0].horasLibres).toEqual(['17:00', '18:00', '19:00']);
  });

  it('una cita ocupa esa hora SOLO en su propia cancha', () => {
    const r = buildDisponibilidadPorCancha({
      recursos: RECURSOS,
      horario: '17:00-20:00',
      citas: [{ recurso_id: 'p1', hora: '17:00:00', estado: 'pendiente' }],
      abonos: [],
    });
    expect(r[0].horasLibres).toEqual(['18:00', '19:00']); // Padel 1 perdió las 17
    expect(r[1].horasLibres).toEqual(['17:00', '18:00', '19:00']); // Padel 2 intacta
  });

  it('un abono de varias horas bloquea todo su rango en su cancha', () => {
    const r = buildDisponibilidadPorCancha({
      recursos: RECURSOS,
      horario: '17:00-21:00',
      citas: [],
      abonos: [{ recurso_id: 'p1', hora_inicio: '18:00:00', hora_fin: '20:00:00' }],
    });
    expect(r[0].horasLibres).toEqual(['17:00', '20:00']); // 18 y 19 bloqueadas
  });

  it('una cita cancelada no ocupa el horario', () => {
    const r = buildDisponibilidadPorCancha({
      recursos: RECURSOS,
      horario: '17:00-19:00',
      citas: [{ recurso_id: 'p1', hora: '17:00:00', estado: 'cancelada' }],
      abonos: [],
    });
    expect(r[0].horasLibres).toEqual(['17:00', '18:00']);
  });

  it('una cancha completamente ocupada aparece con lista vacía (no desaparece)', () => {
    const r = buildDisponibilidadPorCancha({
      recursos: [RECURSOS[0]],
      horario: '17:00-19:00',
      citas: [
        { recurso_id: 'p1', hora: '17:00:00', estado: 'pendiente' },
        { recurso_id: 'p1', hora: '18:00:00', estado: 'pendiente' },
      ],
      abonos: [],
    });
    expect(r[0].horasLibres).toEqual([]);
    expect(r).toHaveLength(1);
  });

  it('sin horario configurado para ese día, devuelve la cancha sin horas', () => {
    const r = buildDisponibilidadPorCancha({
      recursos: [RECURSOS[0]],
      horario: undefined,
      citas: [],
      abonos: [],
    });
    expect(r[0].horasLibres).toEqual([]);
  });

  it('filtra por tipo de servicio cuando se pide (ej. solo padel)', () => {
    const r = buildDisponibilidadPorCancha({
      recursos: RECURSOS,
      horario: '17:00-19:00',
      citas: [],
      abonos: [],
      filtroServicio: 'padel',
    });
    expect(r.map((c) => c.cancha)).toEqual(['Cancha Padel 1', 'Cancha Padel 2']);
  });

  it('el filtro no distingue mayúsculas ni acentos', () => {
    const r = buildDisponibilidadPorCancha({
      recursos: RECURSOS,
      horario: '17:00-19:00',
      citas: [],
      abonos: [],
      filtroServicio: 'Fútbol',
    });
    expect(r.map((c) => c.cancha)).toEqual(['Fútbol 5']);
  });
  it('si el filtro no matchea ninguna cancha, lo señala como servicio inexistente (no como "sin disponibilidad")', () => {
    const r = buildDisponibilidadPorCancha({
      recursos: RECURSOS,
      horario: '17:00-19:00',
      citas: [],
      abonos: [],
      filtroServicio: 'tenis',
    });
    expect(r).toEqual([]);
  });

  it('expone la lista de servicios que SÍ existen, para poder ofrecerlos', () => {
    const servicios = serviciosDisponibles(RECURSOS);
    expect(servicios).toContain('Cancha Padel 1');
    expect(servicios).toContain('Fútbol 5');
  });

  it('serviciosDisponibles sin recursos devuelve lista vacía', () => {
    expect(serviciosDisponibles([])).toEqual([]);
  });
  it('formatea la disponibilidad con una línea por cancha, listando TODAS', () => {
    const texto = formatearDisponibilidad([
      { cancha: 'Cancha Padel 1', horasLibres: ['20:00', '21:00', '22:00'] },
      { cancha: 'Cancha Padel 2', horasLibres: ['17:00', '18:00', '19:00', '22:00'] },
    ]);
    expect(texto).toBe(
      'Cancha Padel 1: 20:00, 21:00, 22:00\nCancha Padel 2: 17:00, 18:00, 19:00, 22:00'
    );
  });

  it('una cancha completa figura como sin turnos libres (no se omite)', () => {
    const texto = formatearDisponibilidad([
      { cancha: 'Cancha Padel 1', horasLibres: [] },
      { cancha: 'Cancha Padel 2', horasLibres: ['17:00'] },
    ]);
    expect(texto).toContain('Cancha Padel 1: sin turnos libres');
    expect(texto).toContain('Cancha Padel 2: 17:00');
  });
});
