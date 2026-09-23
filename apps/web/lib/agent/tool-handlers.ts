import { planificarReserva } from './planificar-reserva';
import { encontrarTurnoDelCliente, type BusquedaTurno } from './encontrar-turno-del-cliente';
import { getFechaArgentina, getHoraArgentina } from './get-fecha-argentina';
import {
  buildDisponibilidadPorCancha,
  serviciosDisponibles,
  formatearDisponibilidad,
} from './build-disponibilidad-por-cancha';

interface ToolContext {
  tenantId: string;
  tier: 'base' | 'pro';
  phone: string; // teléfono real del remitente (lo inyecta el webhook)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  /** Momento actual. Solo se pasa en tests; en producción es "ahora". */
  ahora?: Date;
}

interface ToolResult {
  data?: unknown;
  error?: string;
  /** Motivo del rechazo, para que el modelo lo explique bien al cliente. */
  motivo?: string;
  horasOcupadas?: string[];
}

// Claves de negocio.horarios, indexadas por getUTCDay() (0 = domingo).
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function diaDeLaSemana(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

async function consultarDisponibilidad(
  args: { fecha: string; servicio?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  const { data: citas, error: errorCitas } = await ctx.supabase
    .from('citas')
    .select('recurso_id, hora, estado')
    .eq('tenant_id', ctx.tenantId)
    .eq('fecha', args.fecha);

  if (errorCitas) return { error: 'No se pudo consultar la disponibilidad' };

  const diaSemana = new Date(`${args.fecha}T00:00:00Z`).getUTCDay();

  const { data: abonos, error: errorAbonos } = await ctx.supabase
    .from('abonos')
    .select('recurso_id, hora_inicio, hora_fin')
    .eq('tenant_id', ctx.tenantId)
    .eq('dia_semana', diaSemana)
    .eq('activo', true);

  if (errorAbonos) return { error: 'No se pudo consultar la disponibilidad' };

  const { data: recursos } = await ctx.supabase
    .from('recursos')
    .select('id, nombre, subtipo')
    .eq('tenant_id', ctx.tenantId)
    .eq('activo', true);

  const { data: negocio } = await ctx.supabase
    .from('negocio')
    .select('horarios')
    .eq('tenant_id', ctx.tenantId)
    .single();

  const horarios = (negocio?.horarios ?? {}) as Record<string, string>;
  const horarioDelDia = horarios[DIAS_SEMANA[diaSemana]];

  // Devolvemos la disponibilidad POR CANCHA, no una lista plana de horas.
  // Antes se devolvían horas sueltas sin decir a qué cancha pertenecían, así
  // que el modelo sumaba las ocupaciones de todas las canchas como si fueran
  // una sola y respondía que no había lugar cuando sí lo había.
  const porCancha = buildDisponibilidadPorCancha({
    recursos: recursos ?? [],
    horario: horarioDelDia,
    citas: citas ?? [],
    abonos: abonos ?? [],
    filtroServicio: args.servicio,
  });

  // Si el cliente pidió un servicio puntual y no existe ninguna cancha de ese
  // tipo, hay que distinguirlo de "está todo ocupado": son situaciones muy
  // distintas para el cliente y merecen respuestas distintas.
  if (args.servicio && porCancha.length === 0) {
    return {
      data: {
        fecha: args.fecha,
        servicioInexistente: args.servicio,
        serviciosDisponibles: serviciosDisponibles(recursos ?? []),
        canchas: [],
      },
    };
  }

  return {
    data: {
      fecha: args.fecha,
      horarioDelDia: horarioDelDia ?? 'cerrado',
      canchas: porCancha,
      // Texto ya armado, una línea por cancha: el modelo lo copia tal cual.
      textoParaCliente: formatearDisponibilidad(porCancha),
    },
  };
}

// Turnos activos del cliente que escribe (identificado por su teléfono real) en una fecha.
async function turnosDelClienteEnFecha(ctx: ToolContext, fecha: string) {
  const { data } = await ctx.supabase
    .from('citas')
    .select('id, hora, recurso_id, servicio_id, customer_name')
    .eq('tenant_id', ctx.tenantId)
    .eq('customer_id', ctx.phone)
    .eq('fecha', fecha)
    .neq('estado', 'cancelada');
  return (data ?? []) as Parameters<typeof encontrarTurnoDelCliente>[0];
}

function errorDeBusqueda(busqueda: Exclude<BusquedaTurno, { ok: true }>, fecha: string): ToolResult {
  if (busqueda.motivo === 'ambiguo') {
    const lista = busqueda.opciones.map((horas) => horas.join(' a ')).join(' y ');
    return {
      error: `El cliente tiene más de un turno ese día (${lista}). Preguntale a cuál se refiere y volvé a llamar indicando la hora.`,
      motivo: 'ambiguo',
    };
  }
  return { error: `No encontré ningún turno de este cliente para el ${fecha}.`, motivo: 'no_encontrado' };
}

async function cancelarCita(
  args: { fecha?: string; hora?: string },
  ctx: ToolContext
): Promise<ToolResult> {
  if (!args.fecha) return { error: 'Falta la fecha del turno a cancelar.', motivo: 'datos_faltantes' };

  const busqueda = encontrarTurnoDelCliente(await turnosDelClienteEnFecha(ctx, args.fecha), args.hora);
  if (!busqueda.ok) return errorDeBusqueda(busqueda, args.fecha);

  // Un solo update con todos los ids: el turno completo se cancela junto.
  const { error } = await ctx.supabase
    .from('citas')
    .update({ estado: 'cancelada' })
    .in('id', busqueda.turno.ids)
    .eq('tenant_id', ctx.tenantId)
    .eq('customer_id', ctx.phone);

  if (error) return { error: 'No se pudo cancelar el turno. No le confirmes la cancelación.', motivo: 'error_interno' };
  return { data: { cancelado: true, fecha: args.fecha, horas: busqueda.turno.horas } };
}

async function registrarCita(
  args: {
    customer_name?: string;
    fecha?: string;
    hora?: string;
    servicio_id?: string;
    cantidad_horas?: number;
  },
  ctx: ToolContext
): Promise<ToolResult> {
  const nombre = (args.customer_name ?? '').trim();
  if (!nombre) {
    return { error: 'Falta el nombre del cliente. Pedíselo antes de reservar.', motivo: 'datos_faltantes' };
  }
  if (!args.servicio_id) {
    return {
      error:
        'Falta servicio_id. Usá el id de la cancha elegida tal como figura en el catálogo; si el cliente no eligió cancha, preguntale cuál quiere.',
      motivo: 'datos_faltantes',
    };
  }
  if (!args.fecha || !args.hora) {
    return { error: 'Faltan la fecha o la hora del turno.', motivo: 'datos_faltantes' };
  }

  // 1. El servicio (= la cancha que eligió el cliente) tiene que existir y estar activo
  const { data: servicio } = await ctx.supabase
    .from('servicios')
    .select('id, nombre, precio, activo')
    .eq('id', args.servicio_id)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();

  if (!servicio || !servicio.activo) {
    return {
      error: 'Esa cancha no existe o no está habilitada. Ofrecé solo las del catálogo.',
      motivo: 'servicio_invalido',
    };
  }

  // 2. La cancha física vinculada a ese servicio (se crea sola al dar de alta el servicio)
  const { data: recurso } = await ctx.supabase
    .from('recursos')
    .select('id, nombre')
    .eq('servicio_id', args.servicio_id)
    .eq('tenant_id', ctx.tenantId)
    .eq('activo', true)
    .maybeSingle();

  if (!recurso) {
    return { error: 'Esa cancha no está habilitada para reservas.', motivo: 'servicio_invalido' };
  }

  // 3. Todo lo que ocupa esa cancha ese día: horario de atención, turnos y mensualizados
  const diaSemana = diaDeLaSemana(args.fecha);

  const { data: negocio } = await ctx.supabase
    .from('negocio')
    .select('horarios')
    .eq('tenant_id', ctx.tenantId)
    .single();

  const { data: citas } = await ctx.supabase
    .from('citas')
    .select('hora, estado')
    .eq('tenant_id', ctx.tenantId)
    .eq('recurso_id', recurso.id)
    .eq('fecha', args.fecha);

  const { data: abonos } = await ctx.supabase
    .from('abonos')
    .select('hora_inicio, hora_fin')
    .eq('tenant_id', ctx.tenantId)
    .eq('recurso_id', recurso.id)
    .eq('dia_semana', diaSemana)
    .eq('activo', true);

  const horarios = (negocio?.horarios ?? {}) as Record<string, string>;
  const ahora = ctx.ahora ?? new Date();

  const plan = planificarReserva({
    fecha: args.fecha,
    hora: String(args.hora),
    cantidadHoras: args.cantidad_horas ?? 1,
    horarioDelDia: horarios[DIAS_SEMANA[diaSemana]],
    citasRecurso: citas ?? [],
    abonosRecurso: abonos ?? [],
    hoy: getFechaArgentina(ahora),
    horaActual: getHoraArgentina(ahora),
  });

  if (!plan.ok) {
    return { error: plan.mensaje, motivo: plan.motivo, horasOcupadas: plan.horasOcupadas };
  }

  // 4. Un único insert con todas las horas: es atómico, o entran todas o ninguna.
  // El índice único (cancha, fecha, hora) de la base es la última defensa si otro
  // cliente reservó el mismo horario entre la verificación y este insert.
  const filas = plan.horas.map((hora) => ({
    tenant_id: ctx.tenantId, // NUNCA de los args del modelo
    customer_id: ctx.phone, // teléfono real del remitente, NUNCA de los args
    customer_name: nombre,
    fecha: args.fecha,
    hora,
    servicio_id: servicio.id,
    recurso_id: recurso.id,
  }));

  const { error } = await ctx.supabase.from('citas').insert(filas).select();

  if (error) {
    if (error.code === '23505') {
      return {
        error: 'Ese horario se acaba de ocupar. No se reservó ninguna hora: ofrecé otra alternativa.',
        motivo: 'ocupado',
      };
    }
    return { error: 'No se pudo guardar la reserva. No confirmes nada al cliente.', motivo: 'error_interno' };
  }

  return {
    data: {
      reservado: true,
      cliente: nombre,
      cancha: recurso.nombre,
      fecha: args.fecha,
      horas: plan.horas,
      precioPorHora: servicio.precio,
      precioTotal: servicio.precio * plan.horas.length,
    },
  };
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
  args: {
    fecha_actual?: string;
    hora_actual?: string;
    nueva_fecha?: string;
    nueva_hora?: string;
    nuevo_servicio_id?: string;
  },
  ctx: ToolContext
): Promise<ToolResult> {
  if (!args.fecha_actual || !args.nueva_fecha || !args.nueva_hora) {
    return {
      error: 'Faltan datos: la fecha del turno actual, y la nueva fecha y hora.',
      motivo: 'datos_faltantes',
    };
  }

  // 1. El turno actual del cliente (completo, aunque sea de varias horas)
  const busqueda = encontrarTurnoDelCliente(
    await turnosDelClienteEnFecha(ctx, args.fecha_actual),
    args.hora_actual
  );
  if (!busqueda.ok) return errorDeBusqueda(busqueda, args.fecha_actual);
  const turno = busqueda.turno;

  // 2. La cancha de destino: la misma, salvo que el cliente pida otra
  const servicioId = args.nuevo_servicio_id || turno.servicio_id;
  if (!servicioId) {
    return {
      error: 'No sé en qué cancha es el turno. Preguntale al cliente qué cancha quiere.',
      motivo: 'datos_faltantes',
    };
  }

  const { data: servicio } = await ctx.supabase
    .from('servicios')
    .select('id, nombre, precio, activo')
    .eq('id', servicioId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  const { data: recurso } = await ctx.supabase
    .from('recursos')
    .select('id, nombre')
    .eq('servicio_id', servicioId)
    .eq('tenant_id', ctx.tenantId)
    .eq('activo', true)
    .maybeSingle();

  if (!servicio || !servicio.activo || !recurso) {
    return {
      error: 'Esa cancha no está habilitada. El turno original sigue igual.',
      motivo: 'servicio_invalido',
    };
  }

  // 3. Validar el horario nuevo con la misma regla que una reserva, sin que el
  //    propio turno cuente como ocupado (así se puede correr 19-21 a 20-22).
  const diaSemana = diaDeLaSemana(args.nueva_fecha);
  const { data: negocio } = await ctx.supabase
    .from('negocio')
    .select('horarios')
    .eq('tenant_id', ctx.tenantId)
    .single();
  const { data: citasDestino } = await ctx.supabase
    .from('citas')
    .select('id, hora, estado')
    .eq('tenant_id', ctx.tenantId)
    .eq('recurso_id', recurso.id)
    .eq('fecha', args.nueva_fecha);
  const { data: abonos } = await ctx.supabase
    .from('abonos')
    .select('hora_inicio, hora_fin')
    .eq('tenant_id', ctx.tenantId)
    .eq('recurso_id', recurso.id)
    .eq('dia_semana', diaSemana)
    .eq('activo', true);

  const propias = new Set(turno.ids);
  const ahora = ctx.ahora ?? new Date();
  const plan = planificarReserva({
    fecha: args.nueva_fecha,
    hora: String(args.nueva_hora),
    cantidadHoras: turno.horas.length,
    horarioDelDia: ((negocio?.horarios ?? {}) as Record<string, string>)[DIAS_SEMANA[diaSemana]],
    citasRecurso: ((citasDestino ?? []) as Array<{ id: string; hora: string; estado: string }>).filter(
      (c) => !propias.has(c.id)
    ),
    abonosRecurso: abonos ?? [],
    hoy: getFechaArgentina(ahora),
    horaActual: getHoraArgentina(ahora),
  });

  if (!plan.ok) {
    return {
      error: `${plan.mensaje} El turno original sigue igual.`,
      motivo: plan.motivo,
      horasOcupadas: plan.horasOcupadas,
    };
  }

  // 4. Cambio atómico en la base: se cancela lo viejo y se crea lo nuevo juntos.
  const { error } = await ctx.supabase.rpc('reprogramar_turno', {
    p_tenant_id: ctx.tenantId,
    p_ids_viejos: turno.ids,
    p_filas_nuevas: plan.horas.map((hora) => ({
      customer_id: ctx.phone,
      customer_name: turno.customer_name,
      fecha: args.nueva_fecha,
      hora,
      servicio_id: servicio.id,
      recurso_id: recurso.id,
    })),
  });

  if (error) {
    if (error.code === '23505') {
      return {
        error: 'Ese horario se acaba de ocupar. El turno original sigue igual: ofrecé otra alternativa.',
        motivo: 'ocupado',
      };
    }
    if (String(error.message ?? '').includes('turno_no_encontrado')) {
      return { error: 'El turno original ya no existe o fue cancelado.', motivo: 'no_encontrado' };
    }
    return {
      error: 'No se pudo cambiar el turno. El turno original sigue igual: no confirmes ningún cambio.',
      motivo: 'error_interno',
    };
  }

  return {
    data: {
      reprogramado: true,
      cliente: turno.customer_name,
      cancha: recurso.nombre,
      fechaAnterior: args.fecha_actual,
      horasAnteriores: turno.horas,
      fecha: args.nueva_fecha,
      horas: plan.horas,
      precioTotal: servicio.precio * plan.horas.length,
    },
  };
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
      return consultarDisponibilidad(args as { fecha: string; servicio?: string }, ctx);
    case 'cancelar_cita':
      return cancelarCita(args as Parameters<typeof cancelarCita>[0], ctx);
    case 'registrar_cita':
      return registrarCita(args as Parameters<typeof registrarCita>[0], ctx);
    case 'obtener_catalogo':
      return obtenerCatalogo(ctx);
    case 'procesar_pago':
      return procesarPago(args as { monto: number }, ctx);
    case 'aplicar_descuento':
      return aplicarDescuento(args as { porcentaje: number }, ctx);
    case 'reprogramar_cita':
      return reprogramarCita(args as Parameters<typeof reprogramarCita>[0], ctx);
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
