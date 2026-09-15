import { describe, it, expect, vi } from 'vitest';
import { executeAdminToolCall } from './admin-tool-handlers';

function createMockSupabase(resolvedValue: { data: unknown; error: unknown; count?: number }) {
  const chain: any = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    lte: () => chain,
    then: (resolve: (v: unknown) => void) => resolve(resolvedValue),
  };
  return chain;
}

describe('executeAdminToolCall', () => {
  it('consultar_metricas_plataforma devuelve cantidad de negocios, nunca datos de ventas de tenants', async () => {
    const supabase = createMockSupabase({ data: [{ tipo_crm: 'turnos' }, { tipo_crm: 'ventas' }], error: null, count: 2 });
    const result = await executeAdminToolCall('consultar_metricas_plataforma', {}, { supabase });
    expect(result.data).toHaveProperty('total_negocios');
    expect(result.data).not.toHaveProperty('ventas');
    expect(result.data).not.toHaveProperty('facturacion_tenants');
  });

  it('consultar_facturacion_propia devuelve el total facturado por Matías, no lo que factura cada negocio a sus clientes', async () => {
    const supabase = createMockSupabase({
      data: [{ monto: 5000 }, { monto: 3000 }],
      error: null,
    });
    const result = await executeAdminToolCall('consultar_facturacion_propia', {}, { supabase });
    expect(result.data).toMatchObject({ total: 8000 });
  });

  it('devuelve error controlado para una tool desconocida', async () => {
    const supabase = createMockSupabase({ data: null, error: null });
    const result = await executeAdminToolCall('tool_inexistente', {}, { supabase });
    expect(result.error).toBeDefined();
  });
});
