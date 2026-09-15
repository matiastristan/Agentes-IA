import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { verifyPassword } from '@/lib/admin/hash-password';
import { createSessionToken } from '@/lib/admin/session-token';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  const supabase = createServiceClient();

  const { data: admin } = await supabase
    .from('admins')
    .select('id, password_hash')
    .eq('email', email)
    .single();

  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const token = createSessionToken(admin.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 8,
  });
  return response;
}
