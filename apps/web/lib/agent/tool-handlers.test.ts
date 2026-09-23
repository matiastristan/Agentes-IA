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

// Mock que distingue respuestas según tabla+método (from().select() vs from().insert()),
// necesario para probar flujos con varias consultas encadenadas a tablas distintas
// (ej. registrar_cita que consulta servicios, recursos y citas antes de insertar).
function createTableAwareMock(responses: Record<string, { data: unknown; error: unknown }>) {
  const calls: { method: string; args: unknown[] }[] = [];
  let currentKey = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    from: (...args: unknown[]) => {
      currentKey = String(args[0]);
      calls.push({ method: 'from', args });
      return chain;
    },
    select: (...args: unknown[]) => {
      // Un .select() encadenado después de insert/update devuelve las filas
      // escritas: conserva la clave de la escritura en vez de pisarla.
      if (!currentKey.endsWith(':insert') && !currentKey.endsWith(':update')) {
        currentKey = `${currentKey}:select`;
      }
      calls.push({ method: 'select', args });
      return chain;
    },
    insert: (...args: unknown[]) => {
      currentKey = `${currentKey}:insert`;
      calls.push({ method: 'insert', args });
      return chain;
    },
    update: (...args: unknown[]) => {
      currentKey = `${currentKey}:update`;
      calls.push({ method: 'update', args });
      return chain;
    },
    eq: (...args: unknown[]) => (calls.push({ method: 'eq', args }), chain),
    neq: (...args: unknown[]) => (calls.push({ method: 'neq', args }), chain),
    in: (...args: unknown[]) => (calls.push({ method: 'in', args }), chain),
    rpc: (...args: unknown[]) => {
      calls.push({ method: 'rpc', args });
      return Promise.resolve(responses[`rpc:${String(args[0])}`] ?? { data: null, error: null });
    },
    single: () => {
      calls.push({ method: 'single', args: [] });
      return Promise.resolve(responses[currentKey] ?? { data: null, error: null });
    },
    maybeSingle: () => {
      calls.push({ method: 'maybeSingle', args: [] });
      return Promise.resolve(responses[currentKey] ?? { data: null, error: null });
    },
    then: (resolve: (v: unknown) => void) =>
      resolve(responses[currentKey] ?? { data: null, error: null }),
  };
  return { client: chain, calls };
}

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

  it('consultar_disponibilidad devuelve las horas libres agrupadas POR CANCHA', async () => {
    const { client } = createTableAwareMock({
      'citas:select': { data: [{ recurso_id: 'p1', hora: '17:00:00', estado: 'pendiente' }], error: null },
      'abonos:select': {
        data: [{ recurso_id: 'p1', hora_inicio: '18:00:00', hora_fin: '20:00:00' }],
        error: null,
      },
      'recursos:select': {
        data: [
          { id: 'p1', nombre: 'Cancha Padel 1', subtipo: 'padel' },
          { id: 'p2', nombre: 'Cancha Padel 2', subtipo: 'padel' },
        ],
        error: null,
      },
      'negocio:select': { data: { horarios: { lunes: '17:00-21:00' } }, error: null },
    });

    // 2026-09-21 es lunes
    const result = await executeToolCall('consultar_disponibilidad', { fecha: '2026-09-21' }, {
      tenantId: TENANT_A,
      tier: 'base',
      supabase: client,
      phone: '5491100000000',
    });

    const data = result.data as { canchas: Array<{ cancha: string; horasLibres: string[] }> };
    const padel1 = data.canchas.find((c) => c.cancha === 'Cancha Padel 1')!;
    const padel2 = data.canchas.find((c) => c.cancha === 'Cancha Padel 2')!;

    // Padel 1: 17 ocupada por cita, 18 y 19 por el abono -> queda 20
    expect(padel1.horasLibres).toEqual(['20:00']);
    // Padel 2 está intacta: la ocupación de Padel 1 no la afecta
    expect(padel2.horasLibres).toEqual(['17:00', '18:00', '19:00', '20:00']);
  });

  // --- cancelar_cita --------------------------------------------------------
  const filaCita = (id: string, hora: string, recurso_id = 'rec-p2') => ({
    id, hora: `${hora}:00`, recurso_id, servicio_id: 'srv-p2', customer_name: 'Josue',
  });

  it('cancelar_cita busca solo los turnos del teléfono que escribe', async () => {
    const { client, calls } = createTableAwareMock({ 'citas:select': { data: [filaCita('a', '19:00')], error: null } });
    await executeToolCall('cancelar_cita', { fecha: '2026-10-05' }, { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' });
    const eqs = calls.filter((c) => c.method === 'eq');
    expect(eqs.some((c) => c.args[0] === 'customer_id' && c.args[1] === '5491100000000')).toBe(true);
    expect(eqs.some((c) => c.args[0] === 'tenant_id' && c.args[1] === TENANT_A)).toBe(true);
  });

  it('cancelar_cita cancela TODAS las horas de un turno de dos horas (antes fallaba con .single())', async () => {
    const { client, calls } = createTableAwareMock({
      'citas:select': { data: [filaCita('a', '19:00'), filaCita('b', '20:00')], error: null },
    });
    const r = await executeToolCall('cancelar_cita', { fecha: '2026-10-05' }, { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' });
    const inCall = calls.find((c) => c.method === 'in');
    expect(inCall!.args).toEqual(['id', ['a', 'b']]);
    expect(r.data).toMatchObject({ cancelado: true, horas: ['19:00', '20:00'] });
  });

  it('cancelar_cita con dos turnos separados y sin hora pide aclarar, sin cancelar nada', async () => {
    const { client, calls } = createTableAwareMock({
      'citas:select': { data: [filaCita('a', '17:00'), filaCita('b', '21:00')], error: null },
    });
    const r = await executeToolCall('cancelar_cita', { fecha: '2026-10-05' }, { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' });
    expect(calls.some((c) => c.method === 'update')).toBe(false);
    expect((r as { motivo?: string }).motivo).toBe('ambiguo');
  });

  it('cancelar_cita devuelve error si no encuentra ningún turno de ese cliente esa fecha', async () => {
    const { client, calls } = createTableAwareMock({ 'citas:select': { data: [], error: null } });
    const r = await executeToolCall('cancelar_cita', { fecha: '2026-10-05' }, { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' });
    expect(r.error).toBeDefined();
    expect(calls.some((c) => c.method === 'update')).toBe(false);
  });

  it('obtener_catalogo filtra explícitamente por tenant_id', async () => {
    const { client, calls } = createMockSupabase({ data: [], error: null });
    await executeToolCall('obtener_catalogo', {}, { tenantId: TENANT_A, tier: 'base', supabase: client, phone: '5491100000000' });
    const eqCalls = calls.filter((c) => c.method === 'eq');
    expect(eqCalls.some((c) => c.args[0] === 'tenant_id' && c.args[1] === TENANT_A)).toBe(true);
  });

  // --- registrar_cita -------------------------------------------------------
  // Escenario: lunes 05/10/2026, "hoy" es domingo 04/10 al mediodía (hora AR).
  const AHORA_DOMINGO = new Date('2026-10-04T15:00:00Z');

  function escenarioReserva(overrides: Record<string, { data: unknown; error: unknown }> = {}) {
    return createTableAwareMock({
      'servicios:select': {
        data: { id: 'srv-p2', nombre: 'Cancha Padel 2', precio: 25000, activo: true },
        error: null,
      },
      'recursos:select': { data: { id: 'rec-p2', nombre: 'Cancha Padel 2' }, error: null },
      'negocio:select': { data: { horarios: { lunes: '17:00-23:00' } }, error: null },
      'citas:select': { data: [], error: null },
      'abonos:select': { data: [], error: null },
      'citas:insert': { data: [{ id: 'c1' }], error: null },
      ...overrides,
    });
  }

  const ctxReserva = (client: unknown) => ({
    tenantId: TENANT_A,
    tier: 'base' as const,
    supabase: client,
    phone: '5493876289131',
    ahora: AHORA_DOMINGO,
  });

  const argsBase = {
    customer_name: 'Josue',
    fecha: '2026-10-05',
    hora: '19:00',
    servicio_id: 'srv-p2',
  };

  it('registrar_cita guarda tenant_id y teléfono del CONTEXTO, nunca de los argumentos del modelo', async () => {
    const { client, calls } = escenarioReserva();
    await executeToolCall(
      'registrar_cita',
      { ...argsBase, tenant_id: 'tenant-malicioso', customer_id: '999' },
      ctxReserva(client) as never
    );
    const filas = calls.find((c) => c.method === 'insert')!.args[0] as Array<Record<string, unknown>>;
    expect(filas).toHaveLength(1);
    expect(filas[0].tenant_id).toBe(TENANT_A);
    expect(filas[0].customer_id).toBe('5493876289131');
  });

  it('registrar_cita reserva en la cancha vinculada al servicio elegido', async () => {
    const { client, calls } = escenarioReserva();
    const r = await executeToolCall('registrar_cita', argsBase, ctxReserva(client) as never);
    const eqs = calls.filter((c) => c.method === 'eq');
    expect(eqs.some((c) => c.args[0] === 'servicio_id' && c.args[1] === 'srv-p2')).toBe(true);
    const filas = calls.find((c) => c.method === 'insert')!.args[0] as Array<Record<string, unknown>>;
    expect(filas[0].recurso_id).toBe('rec-p2');
    expect(filas[0].servicio_id).toBe('srv-p2');
    expect((r.data as { reservado: boolean }).reservado).toBe(true);
  });

  it('registrar_cita con cantidad_horas=2 inserta las DOS horas juntas, en la misma cancha', async () => {
    const { client, calls } = escenarioReserva({
      'citas:insert': { data: [{ id: 'c1' }, { id: 'c2' }], error: null },
    });
    const r = await executeToolCall(
      'registrar_cita',
      { ...argsBase, cantidad_horas: 2 },
      ctxReserva(client) as never
    );
    const inserts = calls.filter((c) => c.method === 'insert');
    // Un solo insert con las dos filas: atómico, o entran las dos o ninguna
    expect(inserts).toHaveLength(1);
    const filas = inserts[0].args[0] as Array<Record<string, unknown>>;
    expect(filas.map((f) => f.hora)).toEqual(['19:00', '20:00']);
    expect(new Set(filas.map((f) => f.recurso_id))).toEqual(new Set(['rec-p2']));

    const data = r.data as { horas: string[]; precioTotal: number; cancha: string };
    expect(data.horas).toEqual(['19:00', '20:00']);
    expect(data.precioTotal).toBe(50000);
    expect(data.cancha).toBe('Cancha Padel 2');
  });

  it('registrar_cita NO reserva ninguna hora si la segunda está ocupada (todo o nada)', async () => {
    const { client, calls } = escenarioReserva({
      'citas:select': { data: [{ hora: '20:00:00', estado: 'pendiente' }], error: null },
    });
    const r = await executeToolCall(
      'registrar_cita',
      { ...argsBase, cantidad_horas: 2 },
      ctxReserva(client) as never
    );
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
    expect(r.error).toBeDefined();
    expect((r as { motivo?: string }).motivo).toBe('ocupado');
  });

  it('registrar_cita respeta a los mensualizados (antes reservaba encima de un abono)', async () => {
    const { client, calls } = escenarioReserva({
      'abonos:select': { data: [{ hora_inicio: '18:00:00', hora_fin: '20:00:00' }], error: null },
    });
    const r = await executeToolCall('registrar_cita', argsBase, ctxReserva(client) as never);
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
    expect(r.error).toBeDefined();
  });

  it('registrar_cita busca los abonos del día de la semana correcto (lunes = 1)', async () => {
    const { client, calls } = escenarioReserva();
    await executeToolCall('registrar_cita', argsBase, ctxReserva(client) as never);
    const eqs = calls.filter((c) => c.method === 'eq');
    expect(eqs.some((c) => c.args[0] === 'dia_semana' && c.args[1] === 1)).toBe(true);
  });

  it('registrar_cita rechaza una hora fuera del horario de atención', async () => {
    const { client, calls } = escenarioReserva();
    const r = await executeToolCall(
      'registrar_cita',
      { ...argsBase, hora: '15:00' },
      ctxReserva(client) as never
    );
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
    expect((r as { motivo?: string }).motivo).toBe('fuera_de_horario');
  });

  it('registrar_cita sin servicio_id devuelve error y no reserva (antes quedaba sin cancha)', async () => {
    const { client, calls } = escenarioReserva();
    const { servicio_id, ...sinServicio } = argsBase;
    const r = await executeToolCall('registrar_cita', sinServicio, ctxReserva(client) as never);
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
    expect(r.error).toBeDefined();
  });

  it('registrar_cita con un servicio inexistente devuelve error y no reserva', async () => {
    const { client, calls } = escenarioReserva({ 'servicios:select': { data: null, error: null } });
    const r = await executeToolCall('registrar_cita', argsBase, ctxReserva(client) as never);
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
    expect(r.error).toBeDefined();
  });

  it('registrar_cita con un servicio desactivado devuelve error y no reserva', async () => {
    const { client, calls } = escenarioReserva({
      'servicios:select': {
        data: { id: 'srv-p2', nombre: 'Cancha Padel 2', precio: 25000, activo: false },
        error: null,
      },
    });
    const r = await executeToolCall('registrar_cita', argsBase, ctxReserva(client) as never);
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
    expect(r.error).toBeDefined();
  });

  it('registrar_cita sin cancha habilitada para el servicio devuelve error y no reserva', async () => {
    const { client, calls } = escenarioReserva({ 'recursos:select': { data: null, error: null } });
    const r = await executeToolCall('registrar_cita', argsBase, ctxReserva(client) as never);
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
    expect(r.error).toBeDefined();
  });

  it('registrar_cita sin nombre del cliente devuelve error y no reserva', async () => {
    const { client, calls } = escenarioReserva();
    const r = await executeToolCall(
      'registrar_cita',
      { ...argsBase, customer_name: '   ' },
      ctxReserva(client) as never
    );
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
    expect(r.error).toBeDefined();
  });

  it('si otro cliente ocupó el horario un instante antes (choque en la base), lo informa como ocupado', async () => {
    const { client } = escenarioReserva({
      'citas:insert': { data: null, error: { code: '23505', message: 'duplicate key' } },
    });
    const r = await executeToolCall('registrar_cita', argsBase, ctxReserva(client) as never);
    expect(r.error).toBeDefined();
    expect((r as { motivo?: string }).motivo).toBe('ocupado');
    expect(r.data).toBeUndefined();
  });

  it('un error genérico al guardar se informa como error, nunca como reserva hecha', async () => {
    const { client } = escenarioReserva({
      'citas:insert': { data: null, error: { code: '500', message: 'boom' } },
    });
    const r = await executeToolCall('registrar_cita', argsBase, ctxReserva(client) as never);
    expect(r.error).toBeDefined();
    expect(r.data).toBeUndefined();
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

  // --- reprogramar_cita -----------------------------------------------------
  function escenarioRepro(overrides: Record<string, { data: unknown; error: unknown }> = {}) {
    return createTableAwareMock({
      // Primera lectura de citas: los turnos del cliente el día original
      'citas:select': { data: [filaCita('a', '19:00'), filaCita('b', '20:00')], error: null },
      'servicios:select': { data: { id: 'srv-p2', nombre: 'Cancha Padel 2', precio: 25000, activo: true }, error: null },
      'recursos:select': { data: { id: 'rec-p2', nombre: 'Cancha Padel 2' }, error: null },
      'negocio:select': { data: { horarios: { lunes: '17:00-23:00', martes: '17:00-23:00' } }, error: null },
      'abonos:select': { data: [], error: null },
      'rpc:reprogramar_turno': { data: [{ id: 'n1' }, { id: 'n2' }], error: null },
      ...overrides,
    });
  }
  const ctxRepro = (client: unknown) => ({
    tenantId: TENANT_A, tier: 'base' as const, supabase: client, phone: '5493876289131',
    ahora: new Date('2026-10-04T15:00:00Z'),
  });
  const argsRepro = { fecha_actual: '2026-10-05', nueva_fecha: '2026-10-06', nueva_hora: '18:00' };

  it('reprogramar_cita funciona en el plan base (antes estaba bloqueada a Pro)', async () => {
    const { client } = escenarioRepro();
    const r = await executeToolCall('reprogramar_cita', argsRepro, ctxRepro(client) as never);
    expect(r.error).toBeUndefined();
    expect((r.data as { reprogramado: boolean }).reprogramado).toBe(true);
  });

  it('reprogramar_cita mueve el turno COMPLETO manteniendo la duración (2 horas -> 2 horas)', async () => {
    const { client, calls } = escenarioRepro();
    const r = await executeToolCall('reprogramar_cita', argsRepro, ctxRepro(client) as never);
    const rpc = calls.find((c) => c.method === 'rpc')!;
    const params = rpc.args[1] as { p_tenant_id: string; p_ids_viejos: string[]; p_filas_nuevas: Array<Record<string, unknown>> };
    expect(params.p_tenant_id).toBe(TENANT_A);
    expect(params.p_ids_viejos).toEqual(['a', 'b']);
    expect(params.p_filas_nuevas.map((f) => f.hora)).toEqual(['18:00', '19:00']);
    expect(params.p_filas_nuevas.every((f) => f.customer_id === '5493876289131')).toBe(true);
    expect(r.data).toMatchObject({ horas: ['18:00', '19:00'], horasAnteriores: ['19:00', '20:00'], precioTotal: 50000 });
  });

  it('reprogramar_cita puede correr el turno dentro de su propio horario (19-21 -> 20-22)', async () => {
    // El día nuevo es el mismo y la cancha es la misma: las filas propias no cuentan como ocupadas
    const { client, calls } = escenarioRepro();
    const r = await executeToolCall(
      'reprogramar_cita',
      { fecha_actual: '2026-10-05', nueva_fecha: '2026-10-05', nueva_hora: '20:00' },
      ctxRepro(client) as never
    );
    expect(r.error).toBeUndefined();
    expect(calls.some((c) => c.method === 'rpc')).toBe(true);
  });

  it('reprogramar_cita NO toca el turno original si el horario nuevo está ocupado por un mensualizado', async () => {
    const { client, calls } = escenarioRepro({
      'abonos:select': { data: [{ hora_inicio: '18:00:00', hora_fin: '19:00:00' }], error: null },
    });
    const r = await executeToolCall('reprogramar_cita', argsRepro, ctxRepro(client) as never);
    expect(calls.some((c) => c.method === 'rpc')).toBe(false);
    expect((r as { motivo?: string }).motivo).toBe('ocupado');
    expect(r.error).toContain('sigue');
  });

  it('si otro cliente toma el horario en el último instante (choque en la base), informa ocupado y el original sigue', async () => {
    const { client } = escenarioRepro({
      'rpc:reprogramar_turno': { data: null, error: { code: '23505', message: 'duplicate key' } },
    });
    const r = await executeToolCall('reprogramar_cita', argsRepro, ctxRepro(client) as never);
    expect((r as { motivo?: string }).motivo).toBe('ocupado');
    expect(r.data).toBeUndefined();
  });

  it('reprogramar_cita a otra cancha usa la cancha nueva', async () => {
    const { client, calls } = escenarioRepro();
    await executeToolCall('reprogramar_cita', { ...argsRepro, nuevo_servicio_id: 'srv-p2' }, ctxRepro(client) as never);
    const eqs = calls.filter((c) => c.method === 'eq');
    expect(eqs.some((c) => c.args[0] === 'servicio_id' && c.args[1] === 'srv-p2')).toBe(true);
  });

  it('reprogramar_cita sin turnos del cliente ese día: error, no toca nada', async () => {
    const { client, calls } = escenarioRepro({ 'citas:select': { data: [], error: null } });
    const r = await executeToolCall('reprogramar_cita', argsRepro, ctxRepro(client) as never);
    expect(r.error).toBeDefined();
    expect(calls.some((c) => c.method === 'rpc')).toBe(false);
  });

  it('reprogramar_cita sin la nueva fecha u hora: error, no toca nada', async () => {
    const { client, calls } = escenarioRepro();
    const r = await executeToolCall('reprogramar_cita', { fecha_actual: '2026-10-05' }, ctxRepro(client) as never);
    expect(r.error).toBeDefined();
    expect(calls.some((c) => c.method === 'rpc')).toBe(false);
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
