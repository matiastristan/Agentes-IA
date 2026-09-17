import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { requireAdminSession } from '@/lib/admin/require-admin-session';
import { validateAltaNegocio } from '@/lib/admin/validate-alta-negocio';
import { randomBytes } from 'node:crypto';

function generarPasswordTemporal(): string {
  // Alfanumérico, fácil de leer/dictar por teléfono al cliente, 12 caracteres
  return randomBytes(9)
    .toString('base64')
    .replace(/[+/=]/g, '')
    .slice(0, 12);
}

export async function POST(request: NextRequest) {
  const session = requireAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { valid, errors } = validateAltaNegocio(body);
  if (!valid) {
    return NextResponse.json({ error: 'Datos inválidos', errors }, { status: 400 });
  }

  const { nombreNegocio, email, tipoCrm, rubro, phoneNumberId, accessToken } = body;
  const password = generarPasswordTemporal();
  const supabase = createServiceClient();

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre_negocio: nombreNegocio,
      tipo_crm: tipoCrm,
      rubro,
    },
  });

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: userError?.message ?? 'No se pudo crear el usuario' },
      { status: 500 }
    );
  }

  const { error: negocioError } = await supabase
    .from('negocio')
    .update({
      phone_number_id: phoneNumberId,
      access_token: accessToken,
      meta_connection_status: 'connected',
    })
    .eq('tenant_id', userData.user.id);

  if (negocioError) {
    return NextResponse.json(
      { error: 'Usuario creado, pero falló guardar phone_number_id/access_token: ' + negocioError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, email, password });
}
