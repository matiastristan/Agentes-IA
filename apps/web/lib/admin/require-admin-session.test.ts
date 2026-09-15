import { describe, it, expect, beforeEach } from 'vitest';
import { requireAdminSession } from './require-admin-session';
import { createSessionToken } from './session-token';

function mockRequest(cookieValue?: string) {
  return {
    cookies: {
      get: (name: string) =>
        name === 'admin_session' && cookieValue ? { value: cookieValue } : undefined,
    },
  } as any;
}

describe('requireAdminSession', () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'test-secret';
  });

  it('devuelve la sesión si la cookie tiene un token válido', () => {
    const token = createSessionToken('admin-1');
    const result = requireAdminSession(mockRequest(token));
    expect(result).toEqual({ adminId: 'admin-1' });
  });

  it('devuelve null si no hay cookie', () => {
    expect(requireAdminSession(mockRequest())).toBeNull();
  });

  it('devuelve null si el token es inválido', () => {
    expect(requireAdminSession(mockRequest('token-invalido'))).toBeNull();
  });
});
