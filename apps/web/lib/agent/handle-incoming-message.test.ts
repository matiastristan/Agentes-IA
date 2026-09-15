import { describe, it, expect, vi } from 'vitest';
import { handleIncomingMessage } from './handle-incoming-message';

const NEGOCIO_A = {
  tenant_id: 'tenant-a',
  nombre: 'Barbería A',
  tono_voz: 'casual',
  horarios: {},
  catalogo: [],
  tier: 'base' as const,
  phone_number_id: 'phone-a',
  access_token: 'token-a',
};

function makeDeps(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findNegocioByPhoneNumberId: vi.fn().mockResolvedValue(NEGOCIO_A),
    findOrCreateConversation: vi.fn().mockResolvedValue({ id: 'conv-1' }),
    loadRecentMessages: vi.fn().mockResolvedValue([]),
    saveMessage: vi.fn().mockResolvedValue(undefined),
    callOpenRouter: vi.fn().mockResolvedValue({
      message: { role: 'assistant', content: 'Claro, te ayudo con eso!' },
    }),
    executeToolCall: vi.fn(),
    sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  };
}

describe('handleIncomingMessage', () => {
  it('busca el negocio por phone_number_id del webhook entrante', async () => {
    const deps = makeDeps();
    await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
      deps
    );
    expect(deps.findNegocioByPhoneNumberId).toHaveBeenCalledWith('phone-a');
  });

  it('si no encuentra el negocio, no llama a OpenRouter ni intenta responder', async () => {
    const deps = makeDeps({ findNegocioByPhoneNumberId: vi.fn().mockResolvedValue(null) });
    const result = await handleIncomingMessage(
      { phoneNumberId: 'phone-desconocido', from: '5491100000000', text: 'Hola' },
      deps
    );
    expect(deps.callOpenRouter).not.toHaveBeenCalled();
    expect(result.handled).toBe(false);
  });

  it('guarda el mensaje del usuario y la respuesta del asistente', async () => {
    const deps = makeDeps();
    await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
      deps
    );
    expect(deps.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user', content: 'Hola', tenantId: 'tenant-a' })
    );
    expect(deps.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant', tenantId: 'tenant-a' })
    );
  });

  it('envía la respuesta del asistente por WhatsApp usando el access_token del negocio', async () => {
    const deps = makeDeps();
    await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
      deps
    );
    expect(deps.sendWhatsAppMessage).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'token-a', to: '5491100000000' })
    );
  });

  it('cuando OpenRouter responde con un tool_call, lo ejecuta y hace un segundo round-trip', async () => {
    const deps = makeDeps({
      callOpenRouter: vi
        .fn()
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              { id: 'call_1', function: { name: 'obtener_catalogo', arguments: '{}' } },
            ],
          },
        })
        .mockResolvedValueOnce({
          message: { role: 'assistant', content: 'Tenemos corte clásico a $3500' },
        }),
      executeToolCall: vi.fn().mockResolvedValue({ data: [{ nombre: 'Corte clásico' }] }),
    });

    const result = await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: '¿Qué precios tienen?' },
      deps
    );

    expect(deps.executeToolCall).toHaveBeenCalledWith(
      'obtener_catalogo',
      {},
      expect.objectContaining({ tenantId: 'tenant-a', tier: 'base' })
    );
    expect(deps.callOpenRouter).toHaveBeenCalledTimes(2);
    expect(result.responseText).toBe('Tenemos corte clásico a $3500');
  });

  it('carga el historial por tenantId + phoneFrom, no solo por conversationId (memoria cross-conversación)', async () => {
    const deps = makeDeps();
    await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola de nuevo' },
      deps
    );
    expect(deps.loadRecentMessages).toHaveBeenCalledWith('tenant-a', '5491100000000');
  });
});
