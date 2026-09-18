interface ConsumoVenta {
  producto_id: string | null;
  precio: number;
}

interface ProductoInfo {
  id: string;
  nombre: string;
  rubro: string | null;
}

interface ProductoVendido {
  productoId: string;
  nombre: string;
  rubro: string | null;
  cantidad: number;
  total: number;
}

export function buildProductosMasVendidos({
  consumos,
  productos,
}: {
  consumos: ConsumoVenta[];
  productos: ProductoInfo[];
}): ProductoVendido[] {
  const productoPorId = Object.fromEntries(productos.map((p) => [p.id, p]));
  const acumulado: Record<string, { cantidad: number; total: number }> = {};

  for (const c of consumos) {
    if (!c.producto_id) continue;
    if (!acumulado[c.producto_id]) acumulado[c.producto_id] = { cantidad: 0, total: 0 };
    acumulado[c.producto_id].cantidad += 1;
    acumulado[c.producto_id].total += c.precio;
  }

  return Object.entries(acumulado)
    .map(([productoId, { cantidad, total }]) => ({
      productoId,
      nombre: productoPorId[productoId]?.nombre ?? 'Producto eliminado',
      rubro: productoPorId[productoId]?.rubro ?? null,
      cantidad,
      total,
    }))
    .sort((a, b) => b.total - a.total);
}
