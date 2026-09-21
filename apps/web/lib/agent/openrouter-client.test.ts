import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callOpenRouter, type OpenRouterLimitError } from './openrouter-client';

describe('callOpenRouter', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('llama al endpoint de OpenRouter con el modelo y los mensajes correctos', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { role: 'assistant', content: 'Hola!' } }] }),
    });

    await callOpenRouter({
      model: 'anthropic/claude-3.5-haiku',
      messages: [{ role: 'user', content: 'Hola' }],
      tools: [],
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      })
    );
  });

  it('devuelve el mensaje del primer choice', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { role: 'assistant', content: 'Respuesta' } }] }),
    });

    const result = await callOpenRouter({
      model: 'anthropic/claude-3.5-haiku',
      messages: [{ role: 'user', content: 'Hola' }],
      tools: [],
    });

    expect(result.message.content).toBe('Respuesta');
  });

  it('reintenta hasta 2 veces más si la respuesta no es ok, y después tira error', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(
      callOpenRouter({ model: 'x', messages: [{ role: 'user', content: 'hola' }], tools: [] })
    ).rejects.toThrow();

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('se recupera si el primer intento falla pero el segundo funciona', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { role: 'assistant', content: 'OK' } }] }),
      });

    const result = await callOpenRouter({
      model: 'x',
      messages: [{ role: 'user', content: 'hola' }],
      tools: [],
    });

    expect(result.message.content).toBe('OK');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('con una lista de modelos, prueba el siguiente si el primero falla (ej. 402 sin crédito)', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 402 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { role: 'assistant', content: 'Desde el segundo modelo' } }] }),
      });

    const result = await callOpenRouter({
      models: ['openrouter/free', 'z-ai/glm-5.2:free'],
      messages: [{ role: 'user', content: 'hola' }],
      tools: [],
    });

    expect(result.message.content).toBe('Desde el segundo modelo');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('con una lista de modelos, usa el body con el model correcto en cada intento', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { role: 'assistant', content: 'ok' } }] }),
      });

    await callOpenRouter({
      models: ['openrouter/free', 'google/gemma-4-26b-a4b-it:free'],
      messages: [{ role: 'user', content: 'hola' }],
      tools: [],
    });

    const firstBody = JSON.parse((fetch as any).mock.calls[0][1].body);
    const secondBody = JSON.parse((fetch as any).mock.calls[1][1].body);
    expect(firstBody.model).toBe('openrouter/free');
    expect(secondBody.model).toBe('google/gemma-4-26b-a4b-it:free');
  });

  it('si todos los modelos de la lista fallan, tira error', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 402 })
      .mockResolvedValueOnce({ ok: false, status: 402 });

    await expect(
      callOpenRouter({
        models: ['openrouter/free', 'z-ai/glm-5.2:free'],
        messages: [{ role: 'user', content: 'hola' }],
        tools: [],
      })
    ).rejects.toThrow();
  });

  it('cuando TODOS los modelos devuelven 429, el error indica que se agotó el límite diario', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: false, status: 429 });

    try {
      await callOpenRouter({
        models: ['openrouter/free', 'z-ai/glm-5.2:free'],
        messages: [{ role: 'user', content: 'hola' }],
        tools: [],
      });
      expect.unreachable('debería haber tirado error');
    } catch (err) {
      expect((err as OpenRouterLimitError).esLimiteAgotado).toBe(true);
    }
  });

  it('si falla por 500 (no por límite), el error NO se marca como límite agotado', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    try {
      await callOpenRouter({
        models: ['openrouter/free', 'z-ai/glm-5.2:free'],
        messages: [{ role: 'user', content: 'hola' }],
        tools: [],
      });
      expect.unreachable('debería haber tirado error');
    } catch (err) {
      expect((err as OpenRouterLimitError).esLimiteAgotado).toBeFalsy();
    }
  });

  it('un 429 en el primer modelo no gasta reintentos: pasa directo al siguiente', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { role: 'assistant', content: 'ok' } }] }),
      });

    await callOpenRouter({
      models: ['openrouter/free', 'z-ai/glm-5.2:free'],
      messages: [{ role: 'user', content: 'hola' }],
      tools: [],
    });

    // Exactamente 2 llamadas: una por modelo, sin reintentos desperdiciados
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('con un solo modelo, un 429 NO se reintenta (el límite no se libera en milisegundos)', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, status: 429 });

    await expect(
      callOpenRouter({ model: 'x', messages: [{ role: 'user', content: 'hola' }], tools: [] })
    ).rejects.toThrow();

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
