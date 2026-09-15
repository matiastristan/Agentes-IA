import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';
import { mapExcelRowToProducto } from '@/lib/ventas/map-excel-row';
import type { Json } from '@/lib/supabase/types_db';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

  const productos = rows.map((row) => {
    const mapeado = mapExcelRowToProducto(row);
    return {
      tenant_id: user.id,
      nombre: mapeado.nombre,
      precio: mapeado.precio ?? null,
      stock: mapeado.stock,
      atributos: mapeado.atributos as Json,
    };
  });

  if (productos.length === 0) {
    return NextResponse.json({ error: 'El Excel no tiene filas' }, { status: 400 });
  }

  const { error } = await supabase.from('productos').insert(productos);

  if (error) {
    return NextResponse.json({ error: 'No se pudo importar el catálogo' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cantidad: productos.length });
}
