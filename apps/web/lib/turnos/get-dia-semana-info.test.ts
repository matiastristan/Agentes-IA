import { describe, it, expect } from 'vitest';
import { getDiaSemanaInfo } from './get-dia-semana-info';

describe('getDiaSemanaInfo', () => {
  it('viernes 18/9/2026 es diaSemana 5 y diaKey "viernes"', () => {
    const info = getDiaSemanaInfo('2026-09-18');
    expect(info.diaSemana).toBe(5);
    expect(info.diaKey).toBe('viernes');
  });

  it('domingo 20/9/2026 es diaSemana 0 y diaKey "domingo"', () => {
    const info = getDiaSemanaInfo('2026-09-20');
    expect(info.diaSemana).toBe(0);
    expect(info.diaKey).toBe('domingo');
  });

  it('lunes 21/9/2026 es diaSemana 1 y diaKey "lunes"', () => {
    const info = getDiaSemanaInfo('2026-09-21');
    expect(info.diaSemana).toBe(1);
    expect(info.diaKey).toBe('lunes');
  });
});
