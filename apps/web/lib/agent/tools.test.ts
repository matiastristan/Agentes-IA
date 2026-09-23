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

  it('tier base incluye registrar_venta', () => {
    const tools = getToolsForTier('base');
    const names = tools.map((t) => t.function.name);
    expect(names).toContain('registrar_venta');
  });
});

describe('contrato de registrar_cita', () => {
  const def = getToolsForTier('base').find((t) => t.function.name === 'registrar_cita')!;
  const params = def.function.parameters as {
    properties: Record<string, unknown>;
    required: string[];
  };

  it('servicio_id es obligatorio (sin él la reserva quedaba sin cancha)', () => {
    expect(params.required).toContain('servicio_id');
  });

  it('acepta cantidad_horas para reservar varias horas en una sola llamada', () => {
    expect(params.properties).toHaveProperty('cantidad_horas');
  });

  it('NO tiene ningún parámetro de teléfono: el teléfono sale siempre del remitente real', () => {
    const nombres = Object.keys(params.properties).join(' ').toLowerCase();
    expect(nombres).not.toMatch(/phone|telefono|customer_id/);
  });

  it('NO permite pasar tenant_id: el negocio sale siempre del contexto verificado', () => {
    expect(params.properties).not.toHaveProperty('tenant_id');
  });
});
