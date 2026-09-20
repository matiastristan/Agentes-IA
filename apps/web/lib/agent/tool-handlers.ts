import { findRecursoDisponible } from '../turnos/find-recurso-disponible';

interface ToolContext {
  tenantId: string;
  tier: 'base' | 'pro';
  phone: string; // necesario para anotar_lista_espera
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
}

interface ToolResult {
  data?: unknown;
  error?: string;
}

async function consultarDisponibilidad(
  args: { fecha: string },
  ctx: ToolContext
): Promise<ToolResult> {
  const { data: citas, error: errorCitas } = await ctx.supabase
    .from('citas')
    .select('hora, estado')
    .eq('tenant_id', ctx.tenantId)
    .eq('fecha', args.fecha);

  if (errorCitas) return { error: 'No se pudo consultar la disponibilidad' };

  const diaSemana = new Date(`${args.fecha}T00:00:00Z`).getUTCDay();

  const { data: abonos, error: errorAbonos } = await ctx.supabase
    .from('abonos')
    .select('hora_inicio, hora_fin, cliente_nombre')
    .eq('tenant_id', ctx.tenantId)
    .eq('dia_semana', diaSemana)
    .eq('activo', true);

  if (errorAbonos) return { error: 'No se pudo consultar la disponibilidad' };

  const citasFormato = (citas ?? []).map((c: { hora: string; estado: string }) => ({
    tipo: 'cita',
    hora: c.hora,
    estado: c.estado,
  }));

  // Los abonos son clientes mensualizados: ocupan ese horario TODAS las semanas
  // ese día, aunque no haya una fila en `citas` para esa fecha puntual.
  const abonosFormato = (abonos ?? []).map((a: { hora_inicio: string }) => ({
    tipo: 'abono',
    hora: a.hora_inicio,
    estado: 'ocupado_por_cliente_mensualizado',
  }));

  return { data: [...citasFormato, ...abonosFormato] };
}

async function cancelarCita(
  args: { fecha: string; hora?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  let query = ctx.supabase
    .from('citas')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('customer_id', ctx.phone)
    .eq('fecha', args.fecha)
    .neq('estado', 'cancelada');

  if (args.hora) query = query.eq('hora', args.hora);

  const { data: cita } = await query.single();

  if (!cita) {
    return { error: 'No encontré ningún turno tuyo para esa fecha' };
  }

  const { error } = await ctx.supabase
    .from('citas')
    .update({ estado: 'cancelada' })
    .eq('id', cita.id)
    .eq('tenant_id', ctx.tenantId);

  if (error) return { error: 'No se pudo cancelar el turno' };
  return { data: { cancelado: true } };
}

async function registrarCita(
  args: { customer_name: string; fecha: string; hora: string; servicio_id?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  let recursoId: string | null = null;

  if (args.servicio_id) {
    const { data: servicio } = await ctx.supabase
      .from('servicios')
      .select('subtipo, duracion_minutos, precio')
      .eq('id', args.servicio_id)
      .eq('tenant_id', ctx.tenantId)
      .single();

    const { data: recursos } = await ctx.supabase
      .from('recursos')
      .select('id, subtipo')
      .eq('tenant_id', ctx.tenantId)
      .eq('activo', true);

    const { data: citasExistentes } = await ctx.supabase
      .from('citas')
      .select('recurso_id, hora')
      .eq('tenant_id', ctx.tenantId)
      .eq('fecha', args.fecha)
      .neq('estado', 'cancelada');

    recursoId = findRecursoDisponible({
      recursos: recursos ?? [],
      subtipo: servicio?.subtipo ?? null,
      hora: args.hora,
      citasExistentes: citasExistentes ?? [],
    });

    if (!recursoId) {
      return { error: 'No hay ninguna cancha disponible para ese servicio a esa hora' };
    }
  }

  const { data, error } = await ctx.supabase
    .from('citas')
    .insert({
      tenant_id: ctx.tenantId, // NUNCA tomar el tenant_id de los args del modelo — siempre del contexto verificado
      customer_id: ctx.phone,
      customer_name: args.customer_name,
      fecha: args.fecha,
      hora: args.hora,
      servicio_id: args.servicio_id ?? null,
      recurso_id: recursoId,
    })
    .select()
    .single();

  if (error) return { error: 'No se pudo registrar la cita' };
  return { data };
}

async function obtenerCatalogo(ctx: ToolContext): Promise<ToolResult> {
  const { data, error } = await ctx.supabase
    .from('productos')
    .select('nombre, variantes')
    .eq('tenant_id', ctx.tenantId)
    .eq('activo', true);

  if (error) return { error: 'No se pudo obtener el catálogo' };
  return { data };
}

async function procesarPago(args: { monto: number }, ctx: ToolContext): Promise<ToolResult> {
  // Defensa en profundidad: aunque getToolsForTier('base') ya excluye esta tool
  // del listado que ve el modelo, si de todos modos llega una tool_call para
  // procesar_pago con tier base (prompt injection, bug, lo que sea), se rechaza acá.
  if (ctx.tier !== 'pro') {
    return { error: 'procesar_pago no está disponible en tu tier. Necesitás el plan Pro.' };
  }

  // Fase 9 (Tier Pro & Pagos) todavía no está implementada — stub intencional.
  return { data: { status: 'not_implemented', monto: args.monto } };
}

async function aplicarDescuento(args: { porcentaje: number }, ctx: ToolContext): Promise<ToolResult> {
  if (ctx.tier !== 'pro') {
    return { error: 'aplicar_descuento no está disponible en tu tier. Necesitás el plan Pro.' };
  }
  return { data: { status: 'not_implemented', porcentaje: args.porcentaje } };
}

async function reprogramarCita(
  args: { cita_id: string; nueva_fecha: string; nueva_hora: string },
  ctx: ToolContext
): Promise<ToolResult> {
  if (ctx.tier === 'base') {
    return { error: 'Reprogramar turnos no está disponible en tu tier. Necesitás el plan Pro.' };
  }

  const { data, error } = await ctx.supabase
    .from('citas')
    .update({ fecha: args.nueva_fecha, hora: args.nueva_hora, estado: 'reprogramada' })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', args.cita_id)
    .select()
    .single();

  if (error) return { error: 'No se pudo reprogramar la cita' };
  return { data };
}

async function anotarListaEspera(
  args: { servicio_id: string; fecha: string; hora_desde: string; hora_hasta: string },
  ctx: ToolContext
): Promise<ToolResult> {
  if (ctx.tier === 'base') {
    return { error: 'La lista de espera no está disponible en tu tier. Necesitás el plan Pro.' };
  }

  const { data, error } = await ctx.supabase
    .from('lista_espera')
    .insert({
      tenant_id: ctx.tenantId,
      phone: ctx.phone,
      servicio_id: args.servicio_id,
      franja_horaria_deseada: {
        fecha: args.fecha,
        hora_desde: args.hora_desde,
        hora_hasta: args.hora_hasta,
      },
    })
    .select()
    .single();

  if (error) return { error: 'No se pudo anotar en la lista de espera' };
  return { data };
}

async function registrarVenta(
  args: {
    customer_name: string;
    items: Array<{ producto_id?: string; combo_id?: string; cantidad: number }>;
  },
  ctx: ToolContext
): Promise<ToolResult> {
  const { data: venta, error: ventaError } = await ctx.supabase
    .from('ventas')
    .insert({ tenant_id: ctx.tenantId, customer_name: args.customer_name })
    .select()
    .single();

  if (ventaError) return { error: 'No se pudo registrar la venta' };

  for (const item of args.items) {
    await ctx.supabase.from('venta_items').insert({
      venta_id: venta.id,
      producto_id: item.producto_id ?? null,
      combo_id: item.combo_id ?? null,
      cantidad: item.cantidad,
      precio_unitario: 0,
      es_combo: !!item.combo_id,
    });

    if (item.producto_id) {
      // Nota: update simple, no atómico. Suficiente para el volumen esperado
      // del MVP — si el volumen de ventas simultáneas del mismo producto
      // crece, migrar a una función RPC atómica para evitar race conditions.
      const { data: producto } = await ctx.supabase
        .from('productos')
        .select('stock')
        .eq('tenant_id', ctx.tenantId)
        .eq('id', item.producto_id)
        .single();

      if (producto) {
        await ctx.supabase
          .from('productos')
          .update({ stock: producto.stock - item.cantidad })
          .eq('tenant_id', ctx.tenantId)
          .eq('id', item.producto_id);
      }
    }
  }

  return { data: venta };
}

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  switch (toolName) {
    case 'consultar_disponibilidad':
      return consultarDisponibilidad(args as { fecha: string }, ctx);
    case 'cancelar_cita':
      return cancelarCita(args as { fecha: string; hora?: string }, ctx);
    case 'registrar_cita':
      return registrarCita(
        args as { customer_name: string; fecha: string; hora: string; servicio_id?: string },
        ctx
      );
    case 'obtener_catalogo':
      return obtenerCatalogo(ctx);
    case 'procesar_pago':
      return procesarPago(args as { monto: number }, ctx);
    case 'aplicar_descuento':
      return aplicarDescuento(args as { porcentaje: number }, ctx);
    case 'reprogramar_cita':
      return reprogramarCita(args as { cita_id: string; nueva_fecha: string; nueva_hora: string }, ctx);
    case 'anotar_lista_espera':
      return anotarListaEspera(
        args as { servicio_id: string; fecha: string; hora_desde: string; hora_hasta: string },
        ctx
      );
    case 'registrar_venta':
      return registrarVenta(
        args as {
          customer_name: string;
          items: Array<{ producto_id?: string; combo_id?: string; cantidad: number }>;
        },
        ctx
      );
    default:
      return { error: `Tool desconocida: ${toolName}` };
  }
}
