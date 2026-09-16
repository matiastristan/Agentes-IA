import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exchangeCodeForToken } from './exchange-code-for-token';

describe('exchangeCodeForToken', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    process.env.META_APP_ID = 'app-id-123';
    process.env.META_APP_SECRET = 'app-secret-abc';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('llama al endpoint de intercambio de Meta con el code, client_id y client_secret correctos', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token-largo-de-meta' }),
    });

    await exchangeCodeForToken('el-code-del-popup');

    const [url] = (fetch as any).mock.calls[0];
    expect(url).toContain('client_id=app-id-123');
    expect(url).toContain('client_secret=app-secret-abc');
    expect(url).toContain('code=el-code-del-popup');
  });

  it('devuelve el access_token cuando Meta responde OK', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token-largo-de-meta' }),
    });

    const result = await exchangeCodeForToken('el-code-del-popup');
    expect(result.success).toBe(true);
    expect(result.accessToken).toBe('token-largo-de-meta');
  });

  it('devuelve success:false con el detalle si Meta responde error', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'código inválido o expirado' } }),
    });

    const result = await exchangeCodeForToken('code-vencido');
    expect(result.success).toBe(false);
    expect(result.error).toContain('código inválido o expirado');
  });
});
