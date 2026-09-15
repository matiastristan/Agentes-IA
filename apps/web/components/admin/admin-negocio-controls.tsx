'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Input } from '@/components/ui/input';

interface Props {
  tenantId: string;
  estadoCuentaActual: string;
  overridesActuales: Record<string, boolean>;
  planFechaAltaActual: string | null;
  planCicloActual: string;
}

export function AdminNegocioControls({
  tenantId,
  estadoCuentaActual,
  overridesActuales,
  planFechaAltaActual,
  planCicloActual,
}: Props) {
  const router = useRouter();
  const [fechaAlta, setFechaAlta] = useState(planFechaAltaActual ?? '');
  const [ciclo, setCiclo] = useState(planCicloActual);
  const [loading, setLoading] = useState<string | null>(null);

  async function cambiarEstadoCuenta(nuevoEstado: string) {
    setLoading('estado');
    await fetch(`/api/admin/negocios/${tenantId}/estado-cuenta`, {
      method: 'POST',
      body: JSON.stringify({ estado_cuenta: nuevoEstado }),
    });
    setLoading(null);
    router.refresh();
  }

  async function toggleOverride(featureKey: string, habilitado: boolean) {
    setLoading(featureKey);
    await fetch(`/api/admin/negocios/${tenantId}/overrides`, {
      method: 'POST',
      body: JSON.stringify({ feature_key: featureKey, habilitado }),
    });
    setLoading(null);
    router.refresh();
  }

  async function guardarFechaAlta() {
    setLoading('fecha-alta');
    await fetch(`/api/admin/negocios/${tenantId}/plan-alta`, {
      method: 'POST',
      body: JSON.stringify({ plan_fecha_alta: fechaAlta, plan_ciclo_facturacion: ciclo }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-secondary">Cambiar estado de cuenta</span>
        <div className="flex gap-2">
          {['activo', 'suspendido_pago', 'baja_definitiva'].map((estado) => (
            <Button
              key={estado}
              variant={estado === estadoCuentaActual ? 'primary' : 'secondary'}
              size="sm"
              disabled={loading === 'estado'}
              onClick={() => cambiarEstadoCuenta(estado)}
            >
              {estado}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-secondary">Features de upsell puntual</span>
        {['multi_recurso', 'carga_manual_turnos', 'mobile_vista_scroll_horizontal'].map((key) => (
          <Toggle
            key={key}
            label={key}
            checked={!!overridesActuales[key]}
            disabled={loading === key}
            onCheckedChange={(value) => toggleOverride(key, value)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-secondary">Fecha de alta y ciclo de facturación</span>
        <Input
          type="date"
          value={fechaAlta}
          onChange={(e) => setFechaAlta(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            variant={ciclo === 'mensual' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setCiclo('mensual')}
          >
            Mensual
          </Button>
          <Button
            variant={ciclo === 'anual' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setCiclo('anual')}
          >
            Anual
          </Button>
        </div>
        <Button size="sm" disabled={loading === 'fecha-alta' || !fechaAlta} onClick={guardarFechaAlta}>
          Guardar fecha de alta
        </Button>
      </div>
    </div>
  );
}
