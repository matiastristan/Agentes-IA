import { describe, it, expect } from 'vitest';
import { validateServicio } from './validate-servicio';

describe('validateServicio', () => {
  it('acepta datos válidos', () => {
    expect(
      validateServicio({ nombre: 'Fútbol 5 - 1 hora', duracionMinutos: 60, precio: 42000 })
    ).toEqual({ valid: true, errors: {} });
  });

  it('rechaza sin nombre', () => {
    const r = validateServicio({ nombre: '', duracionMinutos: 60, precio: 42000 });
    expect(r.valid).toBe(false);
    expect(r.errors.nombre).toBeDefined();
  });

  it('rechaza duración cero o negativa', () => {
    const r = validateServicio({ nombre: 'X', duracionMinutos: 0, precio: 1000 });
    expect(r.valid).toBe(false);
    expect(r.errors.duracionMinutos).toBeDefined();
  });

  it('rechaza precio negativo', () => {
    const r = validateServicio({ nombre: 'X', duracionMinutos: 60, precio: -100 });
    expect(r.valid).toBe(false);
    expect(r.errors.precio).toBeDefined();
  });

  it('acepta precio cero (servicio gratuito es válido)', () => {
    const r = validateServicio({ nombre: 'X', duracionMinutos: 60, precio: 0 });
    expect(r.valid).toBe(true);
  });
});
