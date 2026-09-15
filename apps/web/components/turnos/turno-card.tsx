import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type EstadoTurno = 'disponible' | 'ocupado' | 'no_show' | 'reprogramada';

interface TurnoCardProps {
  estado: EstadoTurno;
  hora: string;
  clienteNombre?: string;
}

const estadoConfig: Record<EstadoTurno, { bg: string; label: string }> = {
  disponible: { bg: 'bg-gray-50 border-dashed', label: 'Disponible' },
  ocupado: { bg: 'bg-primary-tint', label: '' },
  no_show: { bg: 'bg-error-bg', label: 'No show' },
  reprogramada: { bg: 'bg-warning-bg', label: 'Reprogramado' },
};

export function TurnoCard({ estado, hora, clienteNombre }: TurnoCardProps) {
  const config = estadoConfig[estado];

  return (
    <Card data-testid="turno-card" className={cn('p-3 flex flex-col gap-1', config.bg)}>
      <span className="text-xs text-text-secondary">{hora}</span>
      {clienteNombre && <span className="text-sm font-medium">{clienteNombre}</span>}
      {config.label && (
        <span className="text-xs font-semibold text-text-secondary">{config.label}</span>
      )}
    </Card>
  );
}
