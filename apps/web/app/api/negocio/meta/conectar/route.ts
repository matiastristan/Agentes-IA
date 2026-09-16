import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken } from '@/lib/meta/exchange-code-for-token';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { code, phoneNumberId } = await request.json();

  if (typeof code !== 'string' || typeof phoneNumberId !== 'string') {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const exchangeResult = await exchangeCodeForToken(code);

  if (!exchangeResult.success) {
    return NextResponse.json({ error: exchangeResult.error }, { status: 400 });
  }

  const { error } = await supabase
    .from('negocio')
    .update({
      phone_number_id: phoneNumberId,
      access_token: exchangeResult.accessToken,
      meta_connection_status: 'connected',
    })
    .eq('tenant_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar la conexión' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
