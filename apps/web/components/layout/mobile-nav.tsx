'use client';

import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Calendar,
  Repeat,
  FileText,
  Package,
  Gift,
  Settings,
  Palette,
  Inbox,
  MessageSquare,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function MobileNav({ tipoCrm }: { tipoCrm: 'ventas' | 'turnos' }) {
  const pathname = usePathname();

  const verticalItems: NavItem[] =
    tipoCrm === 'turnos'
      ? [
          { href: '/turnos', label: 'Calendario', icon: Calendar },
          { href: '/turnos/abonos', label: 'Mensualizados', icon: Repeat },
          { href: '/turnos/servicios', label: 'Servicios', icon: FileText },
          { href: '/turnos/recursos', label: 'Combos', icon: Gift },
        ]
      : [
          { href: '/ventas/catalogo', label: 'Catálogo', icon: Package },
          { href: '/ventas/combos', label: 'Combos', icon: Gift },
        ];

  const items: NavItem[] = [
    { href: '/dashboard', label: 'Inicio', icon: Home },
    ...verticalItems,
    ...(tipoCrm === 'turnos' ? [{ href: '/configuracion/stock', label: 'Stock', icon: Package }] : []),
    { href: '/configuracion/settings', label: 'Ajustes', icon: Settings },
    { href: '/configuracion/apariencia', label: 'Apariencia', icon: Palette },
    { href: '/configuracion/conversaciones', label: 'Conversaciones', icon: Inbox },
    { href: '/configuracion/test-chat', label: 'Probar agente', icon: MessageSquare },
    { href: '/configuracion/alertas', label: 'Alertas', icon: Flame },
  ];

  return (
    <nav className="md:hidden sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
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
            <Icon className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2} />
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
