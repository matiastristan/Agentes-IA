import { describe, it, expect } from 'vitest';
import { estadoVentana24h } from './ventana-24h';

const AHORA = new Date('2026-09-21T20:00:00Z');

describe('estadoVentana24h', () => {
  it('si el cliente escribió hace 2 horas, la ventana está abierta', () => {
    const r = estadoVentana24h('2026-09-21T18:00:00Z', AHORA);
    expect(r.abierta).toBe(true);
  });

  it('informa cuántas horas quedan para que cierre', () => {
    const r = estadoVentana24h('2026-09-21T18:00:00Z', AHORA);
    expect(r.abierta && r.horasRestantes).toBe(22);
  });

  it('si escribió hace más de 24 horas, la ventana está cerrada', () => {
    expect(estadoVentana24h('2026-09-20T19:59:00Z', AHORA).abierta).toBe(false);
  });

  it('justo al límite de 24 horas ya está cerrada', () => {
    expect(estadoVentana24h('2026-09-20T20:00:00Z', AHORA).abierta).toBe(false);
  });

  it('si el cliente nunca escribió, está cerrada', () => {
    expect(estadoVentana24h(null, AHORA).abierta).toBe(false);
  });

  it('con menos de una hora restante informa 0 horas, pero sigue abierta', () => {
    const r = estadoVentana24h('2026-09-20T20:30:00Z', AHORA);
    expect(r.abierta).toBe(true);
    expect(r.abierta && r.horasRestantes).toBe(0);
  });
});
