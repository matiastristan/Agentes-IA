import { describe, it, expect } from 'vitest';
import { computePlanFechaVencimiento } from './compute-plan-vencimiento';

describe('computePlanFechaVencimiento', () => {
  it('ciclo mensual: vence 30 días después de la fecha de alta', () => {
    expect(computePlanFechaVencimiento('2026-01-01', 'mensual')).toBe('2026-01-31');
  });

  it('ciclo anual: vence 365 días después de la fecha de alta', () => {
    expect(computePlanFechaVencimiento('2026-01-01', 'anual')).toBe('2027-01-01');
  });

  it('funciona cruzando cambio de año en mensual', () => {
    expect(computePlanFechaVencimiento('2026-12-15', 'mensual')).toBe('2027-01-14');
  });
});
