import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { requireAdminSession } from '@/lib/admin/require-admin-session';
import { computePlanFechaVencimiento } from '@/lib/admin/compute-plan-vencimiento';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { plan_fecha_alta, plan_ciclo_facturacion } = await request.json();

  if (typeof plan_fecha_alta !== 'string') {
    return NextResponse.json({ error: 'plan_fecha_alta inválida' }, { status: 400 });
  }

  const ciclo: 'mensual' | 'anual' = plan_ciclo_facturacion === 'anual' ? 'anual' : 'mensual';
  const plan_fecha_vencimiento = computePlanFechaVencimiento(plan_fecha_alta, ciclo);

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('negocio')
    .update({ plan_fecha_alta, plan_ciclo_facturacion: ciclo, plan_fecha_vencimiento })
    .eq('tenant_id', id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plan_fecha_vencimiento });
}
