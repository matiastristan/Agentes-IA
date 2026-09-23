import { describe, it, expect } from 'vitest';
import { formatearFechaMensaje } from './formatear-fecha-mensaje';

// "Ahora" = lunes 21/09 17:00 en Argentina (20:00 UTC)
const AHORA = new Date('2026-09-21T20:00:00Z');

describe('formatearFechaMensaje', () => {
  it('un mensaje de hoy muestra solo la hora, en hora de Argentina', () => {
    expect(formatearFechaMensaje('2026-09-21T17:32:00Z', AHORA)).toBe('14:32');
  });

  it('un mensaje de ayer muestra "ayer"', () => {
    expect(formatearFechaMensaje('2026-09-20T15:00:00Z', AHORA)).toBe('ayer');
  });

  it('un mensaje más viejo muestra la fecha', () => {
    expect(formatearFechaMensaje('2026-09-18T15:00:00Z', AHORA)).toBe('18/09');
  });

  it('respeta el cambio de día en Argentina, no en UTC (01:00 UTC del 21 = 22:00 del 20)', () => {
    expect(formatearFechaMensaje('2026-09-21T01:00:00Z', AHORA)).toBe('ayer');
  });
});
