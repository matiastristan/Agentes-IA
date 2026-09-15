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
  const { data, error } = await ctx.supabase
    .from('citas')
    .select('hora, estado')
    .eq('tenant_id', ctx.tenantId)
    .eq('fecha', args.fecha);

  if (error) return { error: 'No se pudo consultar la disponibilidad' };
  return { data };
}

async function registrarCita(
  args: { customer_name: string; fecha: string; hora: string },
  ctx: ToolContext
): Promise<ToolResult> {
  const { data, error } = await ctx.supabase
    .from('citas')
    .insert({
      tenant_id: ctx.tenantId, // NUNCA tomar el tenant_id de los args del modelo — siempre del contexto verificado
      customer_id: args.customer_name,
      customer_name: args.customer_name,
      fecha: args.fecha,
      hora: args.hora,
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

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  switch (toolName) {
    case 'consultar_disponibilidad':
      return consultarDisponibilidad(args as { fecha: string }, ctx);
    case 'registrar_cita':
      return registrarCita(args as { customer_name: string; fecha: string; hora: string }, ctx);
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
    default:
      return { error: `Tool desconocida: ${toolName}` };
  }
}
