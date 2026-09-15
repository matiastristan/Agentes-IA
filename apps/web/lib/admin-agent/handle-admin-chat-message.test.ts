import { describe, it, expect, vi } from 'vitest';
import { handleAdminChatMessage } from './handle-admin-chat-message';

function makeDeps(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    callOpenRouter: vi.fn().mockResolvedValue({
      message: { role: 'assistant', content: 'Tenés 5 negocios activos.' },
    }),
    executeAdminToolCall: vi.fn(),
    ...overrides,
  };
}

describe('handleAdminChatMessage', () => {
  it('devuelve la respuesta del modelo cuando no hay tool_calls', async () => {
    const deps = makeDeps();
    const result = await handleAdminChatMessage('¿Cuántos negocios activos tengo?', [], deps);
    expect(result.responseText).toBe('Tenés 5 negocios activos.');
  });

  it('cuando el modelo pide una tool, la ejecuta y hace un segundo round-trip', async () => {
    const deps = makeDeps({
      callOpenRouter: vi
        .fn()
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              { id: 'call_1', function: { name: 'consultar_metricas_plataforma', arguments: '{}' } },
            ],
          },
        })
        .mockResolvedValueOnce({
          message: { role: 'assistant', content: 'Tenés 5 negocios activos, 3 de turnos y 2 de ventas.' },
        }),
      executeAdminToolCall: vi.fn().mockResolvedValue({
        data: { total_negocios: 5, negocios_activos: 5, por_tipo_crm: { turnos: 3, ventas: 2 } },
      }),
    });

    const result = await handleAdminChatMessage('¿Cómo viene la plataforma?', [], deps);

    expect(deps.executeAdminToolCall).toHaveBeenCalledWith(
      'consultar_metricas_plataforma',
      {},
      expect.anything()
    );
    expect(deps.callOpenRouter).toHaveBeenCalledTimes(2);
    expect(result.responseText).toContain('5 negocios');
  });

  it('incluye el historial previo en los mensajes enviados al modelo', async () => {
    const deps = makeDeps();
    const historial = [{ role: 'user' as const, content: 'Hola' }, { role: 'assistant' as const, content: 'Hola, ¿en qué te ayudo?' }];
    await handleAdminChatMessage('¿Y ahora?', historial, deps);

    const callArgs = (deps.callOpenRouter as any).mock.calls[0][0];
    expect(callArgs.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'Hola' }),
      ])
    );
  });
});
