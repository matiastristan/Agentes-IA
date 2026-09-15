import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionToken, verifySessionToken } from './session-token';

describe('createSessionToken / verifySessionToken', () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'test-secret';
  });

  it('un token creado se verifica correctamente y devuelve el adminId', () => {
    const token = createSessionToken('admin-1');
    expect(verifySessionToken(token)).toEqual({ adminId: 'admin-1' });
  });

  it('un token manipulado (firma inválida) devuelve null', () => {
    const token = createSessionToken('admin-1');
    const tampered = token.slice(0, -2) + 'xx';
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it('un token con secret distinto al usado para verificar devuelve null', () => {
    const token = createSessionToken('admin-1');
    process.env.ADMIN_SESSION_SECRET = 'otro-secret';
    expect(verifySessionToken(token)).toBeNull();
  });

  it('un string cualquiera que no es un token válido devuelve null', () => {
    expect(verifySessionToken('esto-no-es-un-token')).toBeNull();
  });
});
