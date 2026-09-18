// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any };

interface CatalogoItem {
  id: string;
  nombre: string;
  precio: number;
}

/**
 * El system prompt del agente necesita un catálogo simple {id, nombre, precio}
 * — pero esa info vive en tablas distintas según el rubro del negocio:
 * `servicios` para negocios de turnos, `productos` para negocios de ventas.
 * Esta función arma ese catálogo desde la tabla correcta. El `id` es
 * necesario para que registrar_cita pueda referenciar exactamente qué
 * servicio se reservó.
 */
export async function buildCatalogoParaNegocio(
  supabase: SupabaseLike,
  tenantId: string,
  tipoCrm: 'ventas' | 'turnos'
): Promise<CatalogoItem[]> {
  const tabla = tipoCrm === 'turnos' ? 'servicios' : 'productos';

  const { data } = await supabase.from(tabla).select('id, nombre, precio').eq('tenant_id', tenantId).eq('activo', true);

  return (data as CatalogoItem[]) ?? [];
}
