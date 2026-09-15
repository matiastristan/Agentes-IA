interface ProductoMapeado {
  nombre: string;
  precio?: number;
  stock: number;
  atributos: Record<string, unknown>;
}

const CAMPOS_RECONOCIDOS = ['nombre', 'precio', 'stock'];

export function mapExcelRowToProducto(row: Record<string, unknown>): ProductoMapeado {
  const atributos: Record<string, unknown> = {};
  let nombre = '';
  let precio: number | undefined;
  let stock = 0;

  for (const [key, value] of Object.entries(row)) {
    const keyLower = key.toLowerCase().trim();
    if (keyLower === 'nombre') {
      nombre = String(value);
    } else if (keyLower === 'precio') {
      precio = Number(value);
    } else if (keyLower === 'stock') {
      stock = Number(value);
    } else if (!CAMPOS_RECONOCIDOS.includes(keyLower)) {
      atributos[key] = value;
    }
  }

  return { nombre, precio, stock, atributos };
}
