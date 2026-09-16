import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendLeadAlertEmail } from './send-lead-alert-email';

describe('sendLeadAlertEmail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'email-1' }) }));
    process.env.RESEND_API_KEY = 'test-resend-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('llama a la API de Resend con el destinatario y el asunto correctos', async () => {
    await sendLeadAlertEmail({
      to: 'dueno@negocio.com',
      nombreNegocio: 'Barbería Test',
      customerName: 'Roberto Gómez',
      customerPhone: '5493876289131',
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-resend-key' }),
      })
    );
  });

  it('el body incluye el destinatario y menciona al cliente caliente', async () => {
    await sendLeadAlertEmail({
      to: 'dueno@negocio.com',
      nombreNegocio: 'Barbería Test',
      customerName: 'Roberto Gómez',
      customerPhone: '5493876289131',
    });

    const [, options] = (fetch as any).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.to).toEqual(['dueno@negocio.com']);
    expect(body.html).toContain('Roberto Gómez');
    expect(body.html).toContain('5493876289131');
  });

  it('devuelve success:false en vez de tirar excepción si Resend responde error', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'invalid key' }) });

    const result = await sendLeadAlertEmail({
      to: 'dueno@negocio.com',
      nombreNegocio: 'Barbería Test',
      customerName: 'Roberto Gómez',
      customerPhone: '5493876289131',
    });

    expect(result.success).toBe(false);
  });
});
