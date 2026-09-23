import { describe, it, expect, vi } from 'vitest';
import { enviarMensajeManual } from './enviar-mensaje-manual';

const AHORA = new Date('2026-09-21T20:00:00Z');

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    cargarConversacion: vi.fn().mockResolvedValue({ id: 'c1', phone_from: '5493876289131' }),
    ultimoMensajeClienteFecha: vi.fn().mockResolvedValue('2026-09-21T18:00:00Z'),
    cargarCredenciales: vi.fn().mockResolvedValue({ phone_number_id: 'pn', access_token: 'tk' }),
    enviar: vi.fn().mockResolvedValue({ success: true, wamid: 'wamid.OUT1' }),
    guardarMensaje: vi.fn().mockResolvedValue(undefined),
    pausarBot: vi.fn().mockResolvedValue(undefined),
    ahora: AHORA,
    ...overrides,
  };
}

describe('enviarMensajeManual', () => {
  it('envía al teléfono de la conversación, guarda el mensaje y pausa el bot', async () => {
    const deps = makeDeps();
    const r = await enviarMensajeManual({ conversationId: 'c1', texto: '  Hola Josue!  ' }, deps);

    expect(r).toEqual({ ok: true, wamid: 'wamid.OUT1' });
    expect(deps.enviar).toHaveBeenCalledWith({
      phoneNumberId: 'pn', accessToken: 'tk', to: '5493876289131', text: 'Hola Josue!',
    });
    expect(deps.guardarMensaje).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'c1', content: 'Hola Josue!', wamid: 'wamid.OUT1', status: 'sent' })
    );
    expect(deps.pausarBot).toHaveBeenCalledWith('c1');
  });

  it('rechaza texto vacío sin enviar nada', async () => {
    const deps = makeDeps();
    const r = await enviarMensajeManual({ conversationId: 'c1', texto: '   ' }, deps);
    expect(r).toMatchObject({ ok: false, codigo: 'texto_invalido' });
    expect(deps.enviar).not.toHaveBeenCalled();
  });

  it('rechaza texto de más de 4096 caracteres (límite de WhatsApp)', async () => {
    const deps = makeDeps();
    const r = await enviarMensajeManual({ conversationId: 'c1', texto: 'x'.repeat(4097) }, deps);
    expect(r).toMatchObject({ ok: false, codigo: 'texto_invalido' });
    expect(deps.enviar).not.toHaveBeenCalled();
  });

  it('una conversación inexistente o de otro negocio devuelve no_encontrada', async () => {
    const deps = makeDeps({ cargarConversacion: vi.fn().mockResolvedValue(null) });
    const r = await enviarMensajeManual({ conversationId: 'otra', texto: 'Hola' }, deps);
    expect(r).toMatchObject({ ok: false, codigo: 'no_encontrada' });
    expect(deps.enviar).not.toHaveBeenCalled();
  });

  it('con la ventana de 24h cerrada no intenta enviar (Meta lo rechazaría)', async () => {
    const deps = makeDeps({ ultimoMensajeClienteFecha: vi.fn().mockResolvedValue('2026-09-19T10:00:00Z') });
    const r = await enviarMensajeManual({ conversationId: 'c1', texto: 'Hola' }, deps);
    expect(r).toMatchObject({ ok: false, codigo: 'ventana_cerrada' });
    expect(deps.enviar).not.toHaveBeenCalled();
  });

  it('sin WhatsApp conectado devuelve sin_credenciales', async () => {
    const deps = makeDeps({ cargarCredenciales: vi.fn().mockResolvedValue(null) });
    const r = await enviarMensajeManual({ conversationId: 'c1', texto: 'Hola' }, deps);
    expect(r).toMatchObject({ ok: false, codigo: 'sin_credenciales' });
    expect(deps.enviar).not.toHaveBeenCalled();
  });

  it('si Meta rechaza el envío: lo guarda como fallido, NO pausa el bot y devuelve el error', async () => {
    const deps = makeDeps({ enviar: vi.fn().mockResolvedValue({ success: false, error: 'Meta respondió 400' }) });
    const r = await enviarMensajeManual({ conversationId: 'c1', texto: 'Hola' }, deps);
    expect(r).toMatchObject({ ok: false, codigo: 'envio_fallido' });
    expect(deps.guardarMensaje).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    expect(deps.pausarBot).not.toHaveBeenCalled();
  });

  it('marca el mensaje como enviado a mano, para distinguirlo de las respuestas del bot', async () => {
    const deps = makeDeps();
    await enviarMensajeManual({ conversationId: 'c1', texto: 'Hola' }, deps);
    expect(deps.guardarMensaje).toHaveBeenCalledWith(expect.objectContaining({ toolCalled: 'envio_manual' }));
  });
});
