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

  const body = await request.json();
  const update: {
    tono_voz?: string;
    horarios?: Record<string, string>;
    instrucciones_adicionales?: string;
    color_palette?: string;
    recordatorios_activos?: boolean;
  } = {};

  if (typeof body.tono_voz === 'string') update.tono_voz = body.tono_voz;
  if (body.horarios && typeof body.horarios === 'object') update.horarios = body.horarios;
  if (typeof body.instrucciones_adicionales === 'string') {
    update.instrucciones_adicionales = body.instrucciones_adicionales;
  }
  if (typeof body.color_palette === 'string') update.color_palette = body.color_palette;
  if (typeof body.recordatorios_activos === 'boolean') update.recordatorios_activos = body.recordatorios_activos;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const { error } = await supabase.from('negocio').update(update).eq('tenant_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
