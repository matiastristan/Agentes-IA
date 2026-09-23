import { describe, it, expect } from 'vitest';
import { encontrarTurnoDelCliente } from './encontrar-turno-del-cliente';

const fila = (id: string, hora: string, recurso_id = 'p2') => ({
  id, hora: `${hora}:00`, recurso_id, servicio_id: `srv-${recurso_id}`, customer_name: 'Josue',
});

describe('encontrarTurnoDelCliente', () => {
  it('un turno de una hora se encuentra sin indicar la hora', () => {
    const r = encontrarTurnoDelCliente([fila('a', '19:00')]);
    expect(r).toMatchObject({ ok: true, turno: { ids: ['a'], horas: ['19:00'], recurso_id: 'p2' } });
  });

  it('un turno de DOS horas se encuentra completo (el bug de cancelar con .single())', () => {
    const r = encontrarTurnoDelCliente([fila('a', '19:00'), fila('b', '20:00')]);
    expect(r).toMatchObject({ ok: true, turno: { ids: ['a', 'b'], horas: ['19:00', '20:00'] } });
  });

  it('indicando cualquier hora del bloque, devuelve el bloque entero', () => {
    const r = encontrarTurnoDelCliente([fila('a', '19:00'), fila('b', '20:00')], '20:00');
    expect(r).toMatchObject({ ok: true, turno: { ids: ['a', 'b'] } });
  });

  it('las filas llegan desordenadas y se ordenan por hora', () => {
    const r = encontrarTurnoDelCliente([fila('b', '20:00'), fila('a', '19:00')]);
    expect(r).toMatchObject({ ok: true, turno: { ids: ['a', 'b'], horas: ['19:00', '20:00'] } });
  });

  it('dos turnos separados el mismo día, sin hora: pide aclarar cuál', () => {
    const r = encontrarTurnoDelCliente([fila('a', '17:00'), fila('b', '21:00')]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.motivo).toBe('ambiguo');
    if (!r.ok && r.motivo === 'ambiguo') {
      expect(r.opciones).toEqual([['17:00'], ['21:00']]);
    }
  });

  it('dos turnos separados, indicando la hora: elige el correcto', () => {
    const r = encontrarTurnoDelCliente([fila('a', '17:00'), fila('b', '21:00')], '21');
    expect(r).toMatchObject({ ok: true, turno: { ids: ['b'] } });
  });

  it('horas consecutivas en DISTINTAS canchas son dos turnos distintos', () => {
    const r = encontrarTurnoDelCliente([fila('a', '19:00', 'p1'), fila('b', '20:00', 'p2')]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('ambiguo');
  });

  it('sin turnos ese día: no_encontrado', () => {
    const r = encontrarTurnoDelCliente([]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('no_encontrado');
  });

  it('una hora que no coincide con ningún turno: no_encontrado', () => {
    const r = encontrarTurnoDelCliente([fila('a', '19:00')], '22:00');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('no_encontrado');
  });
});
