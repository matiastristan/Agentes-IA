import { describe, it, expect, vi } from 'vitest';
import { handleIncomingMessage } from './handle-incoming-message';
import { OpenRouterLimitError } from './openrouter-client';

const NEGOCIO_A = {
  tenant_id: 'tenant-a',
  nombre: 'Barbería A',
  tono_voz: 'casual',
  horarios: {},
  catalogo: [],
  tier: 'base' as const,
  phone_number_id: 'phone-a',
  access_token: 'token-a',
  email_alertas: 'dueno@barberiaa.com',
};

function makeDeps(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findNegocioByPhoneNumberId: vi.fn().mockResolvedValue(NEGOCIO_A),
    findOrCreateConversation: vi.fn().mockResolvedValue({ id: 'conv-1', bot_desactivado: false }),
    isClienteBloqueado: vi.fn().mockResolvedValue(false),
    loadRecentMessages: vi.fn().mockResolvedValue([]),
    saveMessage: vi.fn().mockResolvedValue(undefined),
    callOpenRouter: vi.fn().mockResolvedValue({
      message: { role: 'assistant', content: 'Claro, te ayudo con eso!' },
    }),
    executeToolCall: vi.fn(),
    sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true }),
    isAlertaLeadCalienteHabilitada: vi.fn().mockResolvedValue(false),
    updateConversationTemperatura: vi.fn().mockResolvedValue(undefined),
    sendLeadAlertEmail: vi.fn().mockResolvedValue({ success: true }),
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

  it('si el negocio no está activo (estado_cuenta), no se procesa el mensaje ni se llama a OpenRouter', async () => {
    const deps = makeDeps({
      findNegocioByPhoneNumberId: vi
        .fn()
        .mockResolvedValue({ ...NEGOCIO_A, estado_cuenta: 'suspendido_pago' }),
    });
    const result = await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
      deps
    );
    expect(deps.callOpenRouter).not.toHaveBeenCalled();
    expect(result.handled).toBe(false);
  });

  it('si el envío por WhatsApp falla, el resultado lo expone (no se pierde en silencio)', async () => {
    const deps = makeDeps({
      sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: false, error: 'Meta respondió 401' }),
    });
    const result = await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
      deps
    );
    expect(result.sendError).toBe('Meta respondió 401');
  });

  it('si el envío por WhatsApp funciona, sendError queda undefined', async () => {
    const deps = makeDeps();
    const result = await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
      deps
    );
    expect(result.sendError).toBeUndefined();
  });

  it('cuando el envío es exitoso, saveMessage del asistente recibe wamid y status sent', async () => {
    const deps = makeDeps({
      sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true, wamid: 'wamid.ABC123' }),
    });
    await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
      deps
    );
    expect(deps.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant', wamid: 'wamid.ABC123', status: 'sent' })
    );
  });

  it('cuando el envío falla, saveMessage del asistente recibe status failed y statusError', async () => {
    const deps = makeDeps({
      sendWhatsAppMessage: vi
        .fn()
        .mockResolvedValue({ success: false, error: 'Meta respondió 400: número inválido' }),
    });
    await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
      deps
    );
    expect(deps.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'assistant',
        status: 'failed',
        statusError: 'Meta respondió 400: número inválido',
      })
    );
  });

  it('si el contacto está bloqueado, no se procesa nada (ni se guarda el mensaje)', async () => {
    const deps = makeDeps({ isClienteBloqueado: vi.fn().mockResolvedValue(true) });
    const result = await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
      deps
    );
    expect(result.handled).toBe(false);
    expect(deps.saveMessage).not.toHaveBeenCalled();
    expect(deps.callOpenRouter).not.toHaveBeenCalled();
  });

  it('si el bot está desactivado en esa conversación puntual, se guarda el mensaje del usuario pero no se llama al agente ni se responde', async () => {
    const deps = makeDeps({
      findOrCreateConversation: vi.fn().mockResolvedValue({ id: 'conv-1', bot_desactivado: true }),
    });
    const result = await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
      deps
    );
    expect(deps.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user', content: 'Hola' })
    );
    expect(deps.callOpenRouter).not.toHaveBeenCalled();
    expect(deps.sendWhatsAppMessage).not.toHaveBeenCalled();
    expect(result.handled).toBe(false);
  });

  it('si la feature de alertas no está habilitada, no se categoriza ni se llama a sendLeadAlertEmail', async () => {
    const deps = makeDeps({
      loadRecentMessages: vi.fn().mockResolvedValue([
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: 'Hola, ¿en qué ayudo?' },
        { role: 'user', content: 'Quiero reservar' },
      ]),
    });
    await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Ya mismo, hoy' },
      deps
    );
    expect(deps.callOpenRouter).toHaveBeenCalledTimes(1); // solo la respuesta principal, no categorización
    expect(deps.sendLeadAlertEmail).not.toHaveBeenCalled();
  });

  it('con la feature habilitada, 3+ mensajes del usuario y el modelo categoriza caliente, dispara sendLeadAlertEmail', async () => {
    const deps = makeDeps({
      isAlertaLeadCalienteHabilitada: vi.fn().mockResolvedValue(true),
      loadRecentMessages: vi.fn().mockResolvedValue([
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: 'Hola, ¿en qué ayudo?' },
        { role: 'user', content: 'Quiero reservar' },
      ]),
      callOpenRouter: vi
        .fn()
        .mockResolvedValueOnce({ message: { content: 'caliente' } })
        .mockResolvedValueOnce({ message: { role: 'assistant', content: 'Dale, te reservo!' } }),
    });

    await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Ya mismo, hoy' },
      deps
    );

    expect(deps.updateConversationTemperatura).toHaveBeenCalledWith('conv-1', 'caliente');
    expect(deps.sendLeadAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({ customerPhone: '5491100000000' })
    );
  });

  it('con la feature habilitada pero menos de 3 mensajes del usuario, no dispara la alerta', async () => {
    const deps = makeDeps({
      isAlertaLeadCalienteHabilitada: vi.fn().mockResolvedValue(true),
      loadRecentMessages: vi.fn().mockResolvedValue([{ role: 'user', content: 'Hola' }]),
      callOpenRouter: vi
        .fn()
        .mockResolvedValueOnce({ message: { content: 'caliente' } })
        .mockResolvedValueOnce({ message: { role: 'assistant', content: 'Hola!' } }),
    });

    await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Ya mismo' },
      deps
    );

    expect(deps.sendLeadAlertEmail).not.toHaveBeenCalled();
  });
  it('si se agotó el cupo de los modelos, le avisa al cliente en vez de dejarlo sin respuesta', async () => {
    const limitError = new OpenRouterLimitError('Se agotó el límite diario', true);
    const deps = makeDeps({
      callOpenRouter: vi.fn().mockRejectedValue(limitError),
    });

    const result = await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
      deps
    );

    // No explota: responde algo al cliente
    expect(result.handled).toBe(true);
    expect(deps.sendWhatsAppMessage).toHaveBeenCalled();
    const textoEnviado = (deps.sendWhatsAppMessage as any).mock.calls[0][0].text;
    expect(textoEnviado.length).toBeGreaterThan(0);
    // No le mostramos detalles técnicos al cliente final
    expect(textoEnviado).not.toContain('OpenRouter');
    expect(textoEnviado).not.toContain('429');
  });

  it('ante un error que NO es de cupo, también responde algo en vez de quedar mudo', async () => {
    const deps = makeDeps({
      callOpenRouter: vi.fn().mockRejectedValue(new Error('network down')),
    });

    const result = await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola' },
      deps
    );

    expect(result.handled).toBe(true);
    expect(deps.sendWhatsAppMessage).toHaveBeenCalled();
  });
  it('guarda el wamid del mensaje entrante, para poder detectar reenvíos de Meta', async () => {
    const deps = makeDeps();
    await handleIncomingMessage(
      { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Hola', wamid: 'wamid.ENTRANTE123' },
      deps
    );
    const guardadoUser = (deps.saveMessage as any).mock.calls.find(
      (c: any[]) => c[0].role === 'user'
    );
    expect(guardadoUser[0].wamid).toBe('wamid.ENTRANTE123');
  });
});
