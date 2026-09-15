import { describe, it, expect } from 'vitest';
import { ADMIN_TOOLS } from './admin-tools';

describe('ADMIN_TOOLS', () => {
  it('incluye consultar_metricas_plataforma y consultar_facturacion_propia', () => {
    const names = ADMIN_TOOLS.map((t) => t.function.name);
    expect(names).toEqual(
      expect.arrayContaining(['consultar_metricas_plataforma', 'consultar_facturacion_propia'])
    );
  });

  it('cada tool tiene el formato esperado por OpenRouter', () => {
    for (const tool of ADMIN_TOOLS) {
      expect(tool.type).toBe('function');
      expect(tool.function).toHaveProperty('name');
      expect(tool.function).toHaveProperty('description');
      expect(tool.function).toHaveProperty('parameters');
    }
  });
});
