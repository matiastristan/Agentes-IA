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
  // --- Bucle de herramientas ------------------------------------------------
  describe('bucle de herramientas', () => {
    const MSG = { phoneNumberId: 'phone-a', from: '5491100000000', text: 'Quiero padel mañana a las 19' };

    const pedirHerramientas = (...calls: Array<{ id: string; name: string; args?: string }>) => ({
      message: {
        role: 'assistant',
        content: null,
        tool_calls: calls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: c.args ?? '{}' },
        })),
      },
    });
    const responderTexto = (content: string | null) => ({ message: { role: 'assistant', content } });

    const RESERVA_OK = {
      data: {
        reservado: true,
        cliente: 'Josue',
        cancha: 'Cancha Padel 2',
        fecha: '2026-09-21',
        horas: ['19:00', '20:00'],
        precioPorHora: 25000,
        precioTotal: 50000,
      },
    };

    it('puede consultar disponibilidad y reservar en el MISMO mensaje (dos vueltas encadenadas)', async () => {
      const deps = makeDeps({
        callOpenRouter: vi
          .fn()
          .mockResolvedValueOnce(pedirHerramientas({ id: 'c1', name: 'consultar_disponibilidad', args: '{"fecha":"2026-09-21"}' }))
          .mockResolvedValueOnce(pedirHerramientas({ id: 'c2', name: 'registrar_cita', args: '{"customer_name":"Josue"}' }))
          .mockResolvedValueOnce(responderTexto('¡Listo Josue! Te anoté.')),
        executeToolCall: vi.fn().mockResolvedValueOnce({ data: { canchas: [] } }).mockResolvedValueOnce(RESERVA_OK),
      });

      const r = await handleIncomingMessage(MSG, deps);

      expect(deps.executeToolCall).toHaveBeenCalledTimes(2);
      expect((deps.executeToolCall as any).mock.calls[0][0]).toBe('consultar_disponibilidad');
      expect((deps.executeToolCall as any).mock.calls[1][0]).toBe('registrar_cita');
      expect(r.responseText).toBe('¡Listo Josue! Te anoté.');
    });

    it('ejecuta TODAS las herramientas pedidas en una misma respuesta, en orden (antes solo la primera)', async () => {
      const deps = makeDeps({
        callOpenRouter: vi
          .fn()
          .mockResolvedValueOnce(
            pedirHerramientas(
              { id: 'c1', name: 'registrar_cita', args: '{"hora":"19:00"}' },
              { id: 'c2', name: 'registrar_cita', args: '{"hora":"20:00"}' }
            )
          )
          .mockResolvedValueOnce(responderTexto('Listo, 19 y 20.')),
        executeToolCall: vi.fn().mockResolvedValue(RESERVA_OK),
      });

      await handleIncomingMessage(MSG, deps);

      const llamadas = (deps.executeToolCall as any).mock.calls;
      expect(llamadas).toHaveLength(2);
      expect(llamadas[0][1]).toEqual({ hora: '19:00' });
      expect(llamadas[1][1]).toEqual({ hora: '20:00' });
    });

    it('le devuelve al modelo un resultado por CADA herramienta, con su tool_call_id (protocolo)', async () => {
      const deps = makeDeps({
        callOpenRouter: vi
          .fn()
          .mockResolvedValueOnce(
            pedirHerramientas({ id: 'c1', name: 'obtener_catalogo' }, { id: 'c2', name: 'consultar_disponibilidad' })
          )
          .mockResolvedValueOnce(responderTexto('ok')),
        executeToolCall: vi.fn().mockResolvedValue({ data: {} }),
      });

      await handleIncomingMessage(MSG, deps);

      const segundaLlamada = (deps.callOpenRouter as any).mock.calls[1][0].messages;
      const asistente = segundaLlamada.find((m: any) => m.role === 'assistant' && m.tool_calls);
      expect(asistente.tool_calls.map((t: any) => t.id)).toEqual(['c1', 'c2']);
      const resultados = segundaLlamada.filter((m: any) => m.role === 'tool');
      expect(resultados.map((m: any) => m.tool_call_id)).toEqual(['c1', 'c2']);
      // El mensaje del asistente va ANTES que los resultados de sus herramientas
      expect(segundaLlamada.indexOf(asistente)).toBeLessThan(segundaLlamada.indexOf(resultados[0]));
    });

    it('si el modelo manda argumentos que no son JSON válido, no explota: le devuelve el error al modelo', async () => {
      const deps = makeDeps({
        callOpenRouter: vi
          .fn()
          .mockResolvedValueOnce(pedirHerramientas({ id: 'c1', name: 'registrar_cita', args: '{hora: 19' }))
          .mockResolvedValueOnce(responderTexto('Perdón, ¿a qué hora querías?')),
        executeToolCall: vi.fn(),
      });

      const r = await handleIncomingMessage(MSG, deps);

      expect(deps.executeToolCall).not.toHaveBeenCalled();
      const resultado = (deps.callOpenRouter as any).mock.calls[1][0].messages.find((m: any) => m.role === 'tool');
      expect(JSON.parse(resultado.content).error).toBeDefined();
      expect(r.responseText).toBe('Perdón, ¿a qué hora querías?');
    });

    it('si una herramienta tira una excepción, el modelo recibe un error en vez de quedar mudo', async () => {
      const deps = makeDeps({
        callOpenRouter: vi
          .fn()
          .mockResolvedValueOnce(pedirHerramientas({ id: 'c1', name: 'consultar_disponibilidad' }))
          .mockResolvedValueOnce(responderTexto('Tuve un problema, ¿probamos de nuevo?')),
        executeToolCall: vi.fn().mockRejectedValue(new Error('db caída')),
      });

      const r = await handleIncomingMessage(MSG, deps);

      const resultado = (deps.callOpenRouter as any).mock.calls[1][0].messages.find((m: any) => m.role === 'tool');
      expect(JSON.parse(resultado.content).error).toBeDefined();
      expect(r.responseText).toBe('Tuve un problema, ¿probamos de nuevo?');
    });

    it('manda UN SOLO WhatsApp por mensaje del cliente, aunque haya varias vueltas', async () => {
      const deps = makeDeps({
        callOpenRouter: vi
          .fn()
          .mockResolvedValueOnce(pedirHerramientas({ id: 'c1', name: 'consultar_disponibilidad' }))
          .mockResolvedValueOnce(pedirHerramientas({ id: 'c2', name: 'registrar_cita' }))
          .mockResolvedValueOnce(responderTexto('Listo')),
        executeToolCall: vi.fn().mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce(RESERVA_OK),
      });

      await handleIncomingMessage(MSG, deps);

      expect(deps.sendWhatsAppMessage).toHaveBeenCalledTimes(1);
    });

    it('si el modelo pide herramientas sin parar, corta en el límite de vueltas y responde algo (nunca silencio)', async () => {
      const deps = makeDeps({
        callOpenRouter: vi.fn().mockResolvedValue(pedirHerramientas({ id: 'cx', name: 'obtener_catalogo' })),
        executeToolCall: vi.fn().mockResolvedValue({ data: {} }),
      });

      const r = await handleIncomingMessage(MSG, deps);

      expect((deps.callOpenRouter as any).mock.calls.length).toBeLessThanOrEqual(5);
      expect(deps.sendWhatsAppMessage).toHaveBeenCalledTimes(1);
      expect((r.responseText ?? "").length).toBeGreaterThan(0);
    });

    it('si la reserva se hizo pero después el modelo FALLA, el cliente recibe la confirmación real armada por código', async () => {
      const deps = makeDeps({
        callOpenRouter: vi
          .fn()
          .mockResolvedValueOnce(pedirHerramientas({ id: 'c1', name: 'registrar_cita' }))
          .mockRejectedValueOnce(new OpenRouterLimitError('cupo', true)),
        executeToolCall: vi.fn().mockResolvedValue(RESERVA_OK),
      });

      const r = await handleIncomingMessage(MSG, deps);

      expect(r.responseText).toContain('Cancha Padel 2');
      expect(r.responseText).toContain('de 19:00 a 21:00');
      // No le decimos "no puedo responderte" a alguien cuyo turno SÍ quedó guardado
      expect(r.responseText).not.toContain('no puedo responderte');
    });

    it('si la reserva se hizo y se agotan las vueltas, también recibe la confirmación real', async () => {
      const deps = makeDeps({
        callOpenRouter: vi
          .fn()
          .mockResolvedValueOnce(pedirHerramientas({ id: 'c1', name: 'registrar_cita' }))
          .mockResolvedValue(pedirHerramientas({ id: 'cx', name: 'obtener_catalogo' })),
        executeToolCall: vi.fn().mockResolvedValueOnce(RESERVA_OK).mockResolvedValue({ data: {} }),
      });

      const r = await handleIncomingMessage(MSG, deps);

      expect(r.responseText).toContain('Cancha Padel 2');
    });

    it('una reserva RECHAZADA nunca dispara la confirmación de respaldo', async () => {
      const deps = makeDeps({
        callOpenRouter: vi
          .fn()
          .mockResolvedValueOnce(pedirHerramientas({ id: 'c1', name: 'registrar_cita' }))
          .mockRejectedValueOnce(new Error('red')),
        executeToolCall: vi.fn().mockResolvedValue({ error: 'Esa cancha ya está ocupada', motivo: 'ocupado' }),
      });

      const r = await handleIncomingMessage(MSG, deps);

      expect(r.responseText).not.toContain('Te dejé anotado');
    });

    it('si el modelo responde texto vacío, no manda un WhatsApp vacío', async () => {
      const deps = makeDeps({
        callOpenRouter: vi.fn().mockResolvedValue(responderTexto('   ')),
      });

      const r = await handleIncomingMessage(MSG, deps);

      expect((r.responseText ?? "").trim().length).toBeGreaterThan(0);
      const enviado = (deps.sendWhatsAppMessage as any).mock.calls[0][0].text;
      expect(enviado.trim().length).toBeGreaterThan(0);
    });

    it('si se pasa del tiempo máximo, deja de llamar al modelo y responde (el servidor corta a los 60s)', async () => {
      let reloj = 0;
      const deps = makeDeps({
        ahora: () => reloj,
        callOpenRouter: vi.fn().mockImplementation(async () => {
          reloj += 20_000; // cada vuelta tarda 20s
          return pedirHerramientas({ id: 'cx', name: 'obtener_catalogo' });
        }),
        executeToolCall: vi.fn().mockResolvedValue({ data: {} }),
      });

      const r = await handleIncomingMessage(MSG, deps);

      // Con 20s por vuelta y un presupuesto de 45s, no puede hacer más de 3 llamadas
      expect((deps.callOpenRouter as any).mock.calls.length).toBeLessThanOrEqual(3);
      expect(deps.sendWhatsAppMessage).toHaveBeenCalledTimes(1);
      expect((r.responseText ?? "").length).toBeGreaterThan(0);
    });

    it('guarda qué herramientas se usaron en el mensaje del asistente', async () => {
      const deps = makeDeps({
        callOpenRouter: vi
          .fn()
          .mockResolvedValueOnce(pedirHerramientas({ id: 'c1', name: 'consultar_disponibilidad' }))
          .mockResolvedValueOnce(pedirHerramientas({ id: 'c2', name: 'registrar_cita' }))
          .mockResolvedValueOnce(responderTexto('Listo')),
        executeToolCall: vi.fn().mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce(RESERVA_OK),
      });

      await handleIncomingMessage(MSG, deps);

      const guardado = (deps.saveMessage as any).mock.calls.find((c: any[]) => c[0].role === 'assistant');
      expect(guardado[0].toolCalled).toBe('consultar_disponibilidad,registrar_cita');
    });
    it('normaliza tool_calls incompletos de modelos gratuitos (sin id o sin type) antes de reenviarlos', async () => {
      const deps = makeDeps({
        callOpenRouter: vi
          .fn()
          .mockResolvedValueOnce({
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{ function: { name: 'obtener_catalogo', arguments: '{}' } }], // sin id ni type
            },
          })
          .mockResolvedValueOnce(responderTexto('ok')),
        executeToolCall: vi.fn().mockResolvedValue({ data: {} }),
      });

      await handleIncomingMessage(MSG, deps);

      const mensajes = (deps.callOpenRouter as any).mock.calls[1][0].messages;
      const asistente = mensajes.find((m: any) => m.role === 'assistant' && m.tool_calls);
      const resultado = mensajes.find((m: any) => m.role === 'tool');
      expect(asistente.tool_calls[0].id).toBeTruthy();
      expect(asistente.tool_calls[0].type).toBe('function');
      // El resultado responde exactamente al id asignado
      expect(resultado.tool_call_id).toBe(asistente.tool_calls[0].id);
    });
    it('argumentos JSON válidos pero que no son un objeto ("null", "5", "[]") se tratan como error', async () => {
      for (const argsRaros of ['null', '5', '[]', '"texto"']) {
        const deps = makeDeps({
          callOpenRouter: vi
            .fn()
            .mockResolvedValueOnce(pedirHerramientas({ id: 'c1', name: 'registrar_cita', args: argsRaros }))
            .mockResolvedValueOnce(responderTexto('ok')),
          executeToolCall: vi.fn(),
        });

        await handleIncomingMessage(MSG, deps);

        expect(deps.executeToolCall).not.toHaveBeenCalled();
        const resultado = (deps.callOpenRouter as any).mock.calls[1][0].messages.find((m: any) => m.role === 'tool');
        expect(typeof resultado.content).toBe('string');
        expect(JSON.parse(resultado.content).error).toBeDefined();
      }
    });
  });
});
