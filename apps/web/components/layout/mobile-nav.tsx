'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function MobileNav({ tipoCrm }: { tipoCrm: 'ventas' | 'turnos' }) {
  const pathname = usePathname();

  const verticalItems: NavItem[] =
    tipoCrm === 'turnos'
      ? [
          { href: '/turnos', label: 'Calendario', icon: '📅' },
          { href: '/turnos/servicios', label: 'Servicios', icon: '🧾' },
          { href: '/turnos/recursos', label: 'Recursos', icon: '🧩' },
          { href: '/turnos/configuracion', label: 'Recordatorios', icon: '⏰' },
        ]
      : [
          { href: '/ventas/catalogo', label: 'Catálogo', icon: '📦' },
          { href: '/ventas/combos', label: 'Combos', icon: '🎁' },
        ];

  const items: NavItem[] = [
    { href: '/dashboard', label: 'Inicio', icon: '🏠' },
    ...verticalItems,
    { href: '/configuracion/settings', label: 'Ajustes', icon: '⚙️' },
    { href: '/configuracion/test-chat', label: 'Probar agente', icon: '💬' },
    { href: '/configuracion/alertas', label: 'Alertas', icon: '🔥' },
  ];

  return (
    <nav className="md:hidden sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium',
              'transition-[background-color,color] duration-150 ease-out',
              active ? 'bg-primary-tint text-primary' : 'text-text-secondary'
            )}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
