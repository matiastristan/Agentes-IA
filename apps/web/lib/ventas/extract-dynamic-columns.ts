interface ProductoConAtributos {
  atributos: Record<string, unknown>;
}

export function extractDynamicColumns(productos: ProductoConAtributos[]): string[] {
  const columnas: string[] = [];
  for (const producto of productos) {
    for (const key of Object.keys(producto.atributos)) {
      if (!columnas.includes(key)) columnas.push(key);
    }
  }
  return columnas;
}
