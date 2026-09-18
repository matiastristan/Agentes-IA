import { describe, it, expect, vi } from 'vitest';
import { executeToolCall } from './tool-handlers';

// Mock encadenable de Supabase: cada método devuelve `this` y registra la llamada,
// hasta que se resuelve con .then() (simulando el thenable de supabase-js).
function createMockSupabase(resolvedValue: { data: unknown; error: unknown }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain: any = {
    from: (...args: unknown[]) => (calls.push({ method: 'from', args }), chain),
    select: (...args: unknown[]) => (calls.push({ method: 'select', args }), chain),
    insert: (...args: unknown[]) => (calls.push({ method: 'insert', args }), chain),
    update: (...args: unknown[]) => (calls.push({ method: 'update', args }), chain),
    eq: (...args: unknown[]) => (calls.push({ method: 'eq', args }), chain),
    single: () => (calls.push({ method: 'single', args: [] }), Promise.resolve(resolvedValue)),
    then: (resolve: (v: unknown) => void) => resolve(resolvedValue),
  };
  return { client: chain, calls };
}

const TENANT_A = 'tenant-a-uuid';

describe('executeToolCall — aislamiento multi-tenant', () => {
  it('consultar_disponibilidad filtra explícitamente por tenant_id', async () => {
    const { client, calls } = createMockSupabase({ data: [], error: null });
    await executeToolCall('consultar_disponibilidad', { fecha: '2026-10-01' }, {
      tenantId: TENANT_A,
      tier: 'base',
      supabase: client,
      phone: '5491100000000',
    });
    const eqCalls = calls.filter((c) => c.method === 'eq');
    expect(eqCalls.some((c) => c.args[0] === 'tenant_id' && c.args[1] === TENANT_A)).toBe(true);
  });

  it('obtener_catalogo filtra explícitamente por tenant_id', async () => {
    const { client, calls } = createMockSupabase({ data: [], error: null });
    await executeToolCall('obtener_catalogo', {}, { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' });
    const eqCalls = calls.filter((c) => c.method === 'eq');
    expect(eqCalls.some((c) => c.args[0] === 'tenant_id' && c.args[1] === TENANT_A)).toBe(true);
  });

  it('registrar_cita inserta con tenant_id seteado explícitamente en el payload', async () => {
    const { client, calls } = createMockSupabase({ data: { id: '1' }, error: null });
    await executeToolCall(
      'registrar_cita',
      { customer_name: 'Juan', fecha: '2026-10-01', hora: '10:00' },
      { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' }
    );
    const insertCall = calls.find((c) => c.method === 'insert');
    expect(insertCall).toBeDefined();
    const payload = insertCall!.args[0] as { tenant_id: string };
    expect(payload.tenant_id).toBe(TENANT_A);
  });

  it('registrar_cita usa ctx.phone (el teléfono real) como customer_id, no el nombre del cliente', async () => {
    const { client, calls } = createMockSupabase({ data: { id: '1' }, error: null });
    await executeToolCall(
      'registrar_cita',
      { customer_name: 'Juan', fecha: '2026-10-01', hora: '10:00' },
      { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' }
    );
    const insertCall = calls.find((c) => c.method === 'insert');
    const payload = insertCall!.args[0] as { customer_id: string; customer_name: string };
    expect(payload.customer_id).toBe('5491100000000');
    expect(payload.customer_name).toBe('Juan');
  });

  it('registrar_cita guarda servicio_id cuando el modelo lo pasa', async () => {
    const { client, calls } = createMockSupabase({ data: { id: '1' }, error: null });
    await executeToolCall(
      'registrar_cita',
      { customer_name: 'Juan', fecha: '2026-10-01', hora: '10:00', servicio_id: 'srv-123' },
      { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' }
    );
    const insertCall = calls.find((c) => c.method === 'insert');
    const payload = insertCall!.args[0] as { servicio_id: string | null };
    expect(payload.servicio_id).toBe('srv-123');
  });

  it('registrar_cita guarda servicio_id como null si no se pasa (no rompe)', async () => {
    const { client, calls } = createMockSupabase({ data: { id: '1' }, error: null });
    await executeToolCall(
      'registrar_cita',
      { customer_name: 'Juan', fecha: '2026-10-01', hora: '10:00' },
      { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' }
    );
    const insertCall = calls.find((c) => c.method === 'insert');
    const payload = insertCall!.args[0] as { servicio_id: string | null };
    expect(payload.servicio_id).toBeNull();
  });

  it('procesar_pago es rechazado si el tier es base, incluso si por error se invoca', async () => {
    const { client } = createMockSupabase({ data: null, error: null });
    const result = await executeToolCall('procesar_pago', { monto: 5000 }, {
      tenantId: TENANT_A,
      tier: 'base',
      supabase: client,
      phone: '5491100000000',
    });
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/tier|pro|no disponible/i);
  });

  it('procesar_pago en tier pro devuelve un stub (Fase 9 no implementada todavía)', async () => {
    const { client } = createMockSupabase({ data: null, error: null });
    const result = await executeToolCall('procesar_pago', { monto: 5000 }, {
      tenantId: TENANT_A,
      tier: 'pro',
      supabase: client,
      phone: '5491100000000',
    });
    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({ status: 'not_implemented' });
  });

  it('devuelve error controlado para un nombre de tool desconocido', async () => {
    const { client } = createMockSupabase({ data: null, error: null });
    const result = await executeToolCall('tool_inexistente', {}, {
      tenantId: TENANT_A,
      tier: 'base',
      supabase: client,
      phone: '5491100000000',
    });
    expect(result.error).toBeDefined();
  });

  it('reprogramar_cita filtra explícitamente por tenant_id al actualizar', async () => {
    const { client, calls } = createMockSupabase({ data: { id: 'cita-1' }, error: null });
    await executeToolCall(
      'reprogramar_cita',
      { cita_id: 'cita-1', nueva_fecha: '2026-10-05', nueva_hora: '15:00' },
      { tenantId: TENANT_A, tier: 'pro', supabase: client, phone: '5491100000000' }
    );
    const eqCalls = calls.filter((c) => c.method === 'eq');
    expect(eqCalls.some((c) => c.args[0] === 'tenant_id' && c.args[1] === TENANT_A)).toBe(true);
  });

  it('reprogramar_cita es rechazada si el tier es base (feature de Pro)', async () => {
    const { client } = createMockSupabase({ data: null, error: null });
    const result = await executeToolCall(
      'reprogramar_cita',
      { cita_id: 'cita-1', nueva_fecha: '2026-10-05', nueva_hora: '15:00' },
      { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' }
    );
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/tier|pro|no disponible/i);
  });

  it('anotar_lista_espera inserta con tenant_id seteado explícitamente', async () => {
    const { client, calls } = createMockSupabase({ data: { id: '1' }, error: null });
    await executeToolCall(
      'anotar_lista_espera',
      { servicio_id: 'serv-1', fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' },
      { tenantId: TENANT_A, tier: 'pro', supabase: client, phone: '5491100000000' }
    );
    const insertCall = calls.find((c) => c.method === 'insert');
    const payload = insertCall!.args[0] as { tenant_id: string };
    expect(payload.tenant_id).toBe(TENANT_A);
  });

  it('anotar_lista_espera es rechazada si el tier es base (feature de Pro)', async () => {
    const { client } = createMockSupabase({ data: null, error: null });
    const result = await executeToolCall(
      'anotar_lista_espera',
      { servicio_id: 'serv-1', fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' },
      { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' }
    );
    expect(result.error).toBeDefined();
  });

  it('registrar_venta filtra explícitamente por tenant_id al insertar la venta', async () => {
    const { client, calls } = createMockSupabase({ data: { id: 'venta-1' }, error: null });
    await executeToolCall(
      'registrar_venta',
      { customer_name: 'Juan', items: [{ producto_id: 'prod-1', cantidad: 2 }] },
      { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' }
    );
    const insertCalls = calls.filter((c) => c.method === 'insert');
    const ventaInsert = insertCalls[0].args[0] as { tenant_id: string };
    expect(ventaInsert.tenant_id).toBe(TENANT_A);
  });
});
