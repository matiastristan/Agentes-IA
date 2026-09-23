import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Bot ON/OFF para una conversación puntual.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.botActivo !== 'boolean') {
    return NextResponse.json({ error: 'Falta botActivo (true/false)' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('conversations')
    .update({ bot_desactivado: !body.botActivo, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });

  return NextResponse.json({ ok: true, botActivo: body.botActivo });
}
