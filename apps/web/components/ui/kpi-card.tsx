import { Card } from './card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: number | string;
  trend?: number;
  accent?: 'primary' | 'frio' | 'moderado' | 'caliente';
  icon?: React.ReactNode;
}

// Los KPI cards comparten el mismo lenguaje visual que las tarjetas del calendario:
// borde izquierdo coloreado (según el "accent" o la paleta activa), transición
// suave al hover, y valor destacado con el color de la paleta para dar contraste.
export function KPICard({ label, value, trend, accent = 'primary', icon }: KPICardProps) {
  const isPositive = typeof trend === 'number' && trend >= 0;

  const accentBorder = {
    primary: 'border-l-primary',
    frio: 'border-l-temp-frio',
    moderado: 'border-l-temp-moderado',
    caliente: 'border-l-temp-caliente',
  }[accent];

  const accentText = {
    primary: 'text-primary',
    frio: 'text-temp-frio',
    moderado: 'text-temp-moderado',
    caliente: 'text-temp-caliente',
  }[accent];

  return (
    <Card
      className={cn(
        'p-6 flex flex-col gap-2 border-l-4',
        accentBorder,
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-md'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {label}
        </span>
        {icon && <span className={cn('shrink-0', accentText)}>{icon}</span>}
      </div>
      <span className={cn('text-4xl font-bold tabular-nums', accentText)}>{value}</span>
      {typeof trend === 'number' && (
        <span className={cn('text-xs font-medium', isPositive ? 'text-success' : 'text-error')}>
          {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </Card>
  );
}
