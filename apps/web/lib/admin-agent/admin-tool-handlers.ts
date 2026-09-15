interface AdminToolContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
}

interface AdminToolResult {
  data?: unknown;
  error?: string;
}

async function consultarMetricasPlataforma(ctx: AdminToolContext): Promise<AdminToolResult> {
  // Deliberadamente NO se consultan ventas/citas de los tenants — decisión
  // ética documentada en el spec de D1: el panel solo ve datos de la
  // plataforma (cantidad de negocios), nunca lo que cada uno vende.
  const { data, error } = await ctx.supabase.from('negocio').select('tipo_crm, rubro, estado_cuenta');

  if (error) return { error: 'No se pudieron consultar las métricas' };

  const lista = (data as Array<{ tipo_crm: string; rubro: string; estado_cuenta: string }>) ?? [];
  const activos = lista.filter((n) => n.estado_cuenta === 'activo');
  const porTipo: Record<string, number> = {};
  for (const n of activos) {
    porTipo[n.tipo_crm] = (porTipo[n.tipo_crm] ?? 0) + 1;
  }

  return {
    data: {
      total_negocios: lista.length,
      negocios_activos: activos.length,
      por_tipo_crm: porTipo,
    },
  };
}

async function consultarFacturacionPropia(ctx: AdminToolContext): Promise<AdminToolResult> {
  // Suma lo que Matías le factura a sus clientes (su propio negocio), nunca
  // lo que los tenants facturan a los suyos.
  const { data, error } = await ctx.supabase.from('facturacion_negocio').select('monto');

  if (error) return { error: 'No se pudo consultar la facturación' };

  const lista = (data as Array<{ monto: number }>) ?? [];
  const total = lista.reduce((sum, f) => sum + f.monto, 0);

  return { data: { total } };
}

export async function executeAdminToolCall(
  toolName: string,
  _args: Record<string, unknown>,
  ctx: AdminToolContext
): Promise<AdminToolResult> {
  switch (toolName) {
    case 'consultar_metricas_plataforma':
      return consultarMetricasPlataforma(ctx);
    case 'consultar_facturacion_propia':
      return consultarFacturacionPropia(ctx);
    default:
      return { error: `Tool desconocida: ${toolName}` };
  }
}
