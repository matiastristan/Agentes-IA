import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types_db';

interface ProductoImportado {
  nombre: string;
  precio?: number;
  stock: number;
  rubro?: string;
  atributos: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { productos } = (await request.json()) as { productos: ProductoImportado[] };

  if (!Array.isArray(productos) || productos.length === 0) {
    return NextResponse.json({ error: 'No hay productos para importar' }, { status: 400 });
  }

  const filas = productos.map((p) => ({
    tenant_id: user.id,
    nombre: p.nombre,
    precio: p.precio ?? null,
    stock: p.stock,
    rubro: p.rubro ?? null,
    atributos: p.atributos as Json,
  }));

  const { error } = await supabase.from('productos').insert(filas);

  if (error) {
    return NextResponse.json({ error: 'No se pudo importar el catálogo' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cantidad: filas.length });
}
