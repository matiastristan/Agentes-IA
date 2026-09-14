import { Temperatura } from '@/types/crm';
import { cn } from '@/lib/utils';

const config: Record<Temperatura, { label: string; text: string; bg: string }> = {
  frio: { label: 'Frío', text: 'text-temp-frio', bg: 'bg-temp-frio/10' },
  moderado: { label: 'Moderado', text: 'text-temp-moderado', bg: 'bg-temp-moderado/10' },
  caliente: { label: 'Caliente', text: 'text-temp-caliente', bg: 'bg-temp-caliente/10' },
};

interface BadgeTemperaturaProps {
  value: Temperatura;
  editadoManualmente?: boolean;
}

export function BadgeTemperatura({ value, editadoManualmente }: BadgeTemperaturaProps) {
  const c = config[value];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', c.text, c.bg)}>
      {c.label}
      {editadoManualmente && (
        <svg aria-label="Editado manualmente" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>
      )}
    </span>
  );
}
