import { describe, it, expect } from 'vitest';
import { validateAuthCredentials } from './validate-auth-credentials';

describe('validateAuthCredentials', () => {
  it('acepta un email y password válidos', () => {
    const result = validateAuthCredentials({ email: 'dueno@barberia.com', password: 'Password123!' });
    expect(result.valid).toBe(true);
  });

  it('rechaza un email sin @', () => {
    const result = validateAuthCredentials({ email: 'no-es-un-email', password: 'Password123!' });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it('rechaza un password de menos de 8 caracteres', () => {
    const result = validateAuthCredentials({ email: 'dueno@barberia.com', password: 'short1' });
    expect(result.valid).toBe(false);
    expect(result.errors.password).toBeDefined();
  });

  it('devuelve ambos errores cuando email y password son inválidos', () => {
    const result = validateAuthCredentials({ email: 'x', password: '123' });
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
  });
});
