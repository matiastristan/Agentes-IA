import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { nombre, subtipo } = await request.json();

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('recursos')
    .insert({ tenant_id: user.id, nombre, subtipo: subtipo || null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'No se pudo crear el recurso' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recurso: data });
}
