import { describe, it, expect } from 'vitest';
import { getToolsForTier } from './tools';

describe('getToolsForTier', () => {
  it('tier base incluye las 3 tools básicas', () => {
    const tools = getToolsForTier('base');
    const names = tools.map((t) => t.function.name);
    expect(names).toEqual(
      expect.arrayContaining(['consultar_disponibilidad', 'registrar_cita', 'obtener_catalogo'])
    );
  });

  it('tier base NO incluye procesar_pago (riesgo crítico de seguridad)', () => {
    const tools = getToolsForTier('base');
    const names = tools.map((t) => t.function.name);
    expect(names).not.toContain('procesar_pago');
  });

  it('tier pro incluye procesar_pago y aplicar_descuento además de las básicas', () => {
    const tools = getToolsForTier('pro');
    const names = tools.map((t) => t.function.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'consultar_disponibilidad',
        'registrar_cita',
        'obtener_catalogo',
        'procesar_pago',
        'aplicar_descuento',
      ])
    );
  });

  it('cada tool tiene el formato esperado por OpenRouter (type function + parameters)', () => {
    const tools = getToolsForTier('base');
    for (const tool of tools) {
      expect(tool.type).toBe('function');
      expect(tool.function).toHaveProperty('name');
      expect(tool.function).toHaveProperty('description');
      expect(tool.function).toHaveProperty('parameters');
    }
  });

  it('tier base incluye reprogramar_cita y anotar_lista_espera (el gating real vive en el handler, no acá)', () => {
    const tools = getToolsForTier('base');
    const names = tools.map((t) => t.function.name);
    expect(names).toEqual(expect.arrayContaining(['reprogramar_cita', 'anotar_lista_espera']));
  });
});
