import { Card } from './card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: number | string;
  trend?: number;
}

export function KPICard({ label, value, trend }: KPICardProps) {
  const isPositive = typeof trend === 'number' && trend >= 0;

  return (
    <Card className="p-6 flex flex-col gap-1">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-4xl font-bold text-text-primary">{value}</span>
      {typeof trend === 'number' && (
        <span className={cn('text-xs font-medium', isPositive ? 'text-success' : 'text-error')}>
          {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </Card>
  );
}
