import { describe, it, expect } from 'vitest';
import { getFechaArgentina } from './get-fecha-argentina';

describe('getFechaArgentina', () => {
  it('a las 23:00 UTC, en Argentina (UTC-3) todavía es el mismo día', () => {
    const fecha = getFechaArgentina(new Date('2026-09-18T23:00:00Z'));
    expect(fecha).toBe('2026-09-18');
  });

  it('a la 01:00 UTC, en Argentina (UTC-3) todavía es el día ANTERIOR', () => {
    const fecha = getFechaArgentina(new Date('2026-09-19T01:00:00Z'));
    expect(fecha).toBe('2026-09-18');
  });

  it('a las 04:00 UTC, en Argentina ya es el día siguiente', () => {
    const fecha = getFechaArgentina(new Date('2026-09-19T04:00:00Z'));
    expect(fecha).toBe('2026-09-19');
  });
});
