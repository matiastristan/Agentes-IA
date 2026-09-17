import { describe, it, expect } from 'vitest';
import { validateAltaNegocio } from './validate-alta-negocio';

const BASE = {
  nombreNegocio: 'Barbería Test',
  email: 'dueno@barberia.com',
  tipoCrm: 'turnos' as const,
  rubro: 'barberia',
  phoneNumberId: '1374392039081468',
  accessToken: 'EAAG...',
};

describe('validateAltaNegocio', () => {
  it('acepta datos completos y válidos', () => {
    expect(validateAltaNegocio(BASE)).toEqual({ valid: true, errors: {} });
  });

  it('rechaza sin nombre de negocio', () => {
    const result = validateAltaNegocio({ ...BASE, nombreNegocio: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.nombreNegocio).toBeDefined();
  });

  it('rechaza email inválido', () => {
    const result = validateAltaNegocio({ ...BASE, email: 'no-es-un-email' });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it('rechaza sin phoneNumberId', () => {
    const result = validateAltaNegocio({ ...BASE, phoneNumberId: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.phoneNumberId).toBeDefined();
  });

  it('rechaza sin accessToken', () => {
    const result = validateAltaNegocio({ ...BASE, accessToken: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.accessToken).toBeDefined();
  });

  it('acumula varios errores a la vez', () => {
    const result = validateAltaNegocio({
      ...BASE,
      nombreNegocio: '',
      email: 'mal',
      phoneNumberId: '',
    });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors)).toHaveLength(3);
  });
});
