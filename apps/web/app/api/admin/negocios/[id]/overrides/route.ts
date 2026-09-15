import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { requireAdminSession } from '@/lib/admin/require-admin-session';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { feature_key, habilitado } = await request.json();

  if (typeof feature_key !== 'string' || typeof habilitado !== 'boolean') {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('negocio_feature_overrides')
    .upsert(
      { tenant_id: id, feature_key, habilitado },
      { onConflict: 'tenant_id,feature_key' }
    );

  if (error) {
    return NextResponse.json({ error: 'No se pudo actualizar el override' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
