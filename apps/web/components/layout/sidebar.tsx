'use client';

import { usePathname, useRouter } from 'next/navigation';
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
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function Sidebar({
  tipoCrm,
  nombreNegocio,
}: {
  tipoCrm: 'ventas' | 'turnos';
  nombreNegocio: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

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

  const configuracionItems: NavItem[] = [
    ...(tipoCrm === 'turnos' ? [{ href: '/configuracion/stock', label: 'Stock', icon: Package }] : []),
    { href: '/configuracion/settings', label: 'Ajustes del agente', icon: Settings },
    { href: '/configuracion/apariencia', label: 'Apariencia', icon: Palette },
    { href: '/configuracion/conversaciones', label: 'Conversaciones', icon: Inbox },
    { href: '/configuracion/test-chat', label: 'Probar agente', icon: MessageSquare },
    { href: '/configuracion/alertas', label: 'Alertas', icon: Flame },
  ];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function renderLink(item: NavItem) {
    const active = pathname === item.href;
    const Icon = item.icon;
    return (
      <a
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
          'transition-[background-color,color] duration-150 ease-out',
          active
            ? 'bg-primary-tint text-primary'
            : 'text-text-secondary hover:bg-bg-tint hover:text-text-primary'
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden strokeWidth={2} />
        {item.label}
      </a>
    );
  }

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-card md:h-screen md:sticky md:top-0">
      <div className="p-5 border-b border-border">
        <span className="text-sm font-semibold tracking-tight text-text-primary">FactorIA</span>
        <p className="text-xs text-text-secondary truncate mt-0.5">{nombreNegocio}</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
        {renderLink({ href: '/dashboard', label: 'Inicio', icon: Home })}
        {verticalItems.map(renderLink)}

        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide px-3 mt-4 mb-1">
          Configuración
        </p>
        {configuracionItems.map(renderLink)}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
            'text-text-secondary hover:bg-bg-tint hover:text-error',
            'transition-[background-color,color] duration-150 ease-out'
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
