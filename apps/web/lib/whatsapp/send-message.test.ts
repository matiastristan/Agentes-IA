import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendWhatsAppMessage } from './send-message';

describe('sendWhatsAppMessage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('llama a la Graph API de Meta con el phone_number_id y el access_token correctos', async () => {
    await sendWhatsAppMessage({
      phoneNumberId: '123456',
      accessToken: 'token-abc',
      to: '5491100000000',
      text: 'Hola, ¿en qué te ayudo?',
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v21.0/123456/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-abc' }),
      })
    );
  });

  it('el body incluye el número destino y el texto del mensaje', async () => {
    await sendWhatsAppMessage({
      phoneNumberId: '123456',
      accessToken: 'token-abc',
      to: '5491100000000',
      text: 'Hola',
    });

    const [, options] = (fetch as any).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.to).toBe('5491100000000');
    expect(body.text.body).toBe('Hola');
  });

  it('devuelve success:false en vez de tirar excepción si Meta responde error', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'invalid token' }) });

    const result = await sendWhatsAppMessage({
      phoneNumberId: '123456',
      accessToken: 'token-malo',
      to: '5491100000000',
      text: 'Hola',
    });

    expect(result.success).toBe(false);
  });

  it('el error incluye el mensaje real que devuelve Meta, no solo el status code', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: "Recipient phone number not in allowed list",
          type: "OAuthException",
          code: 131030,
        },
      }),
    });

    const result = await sendWhatsAppMessage({
      phoneNumberId: '123456',
      accessToken: 'token-abc',
      to: '5491100000000',
      text: 'Hola',
    });

    expect(result.error).toContain('Recipient phone number not in allowed list');
  });
});
