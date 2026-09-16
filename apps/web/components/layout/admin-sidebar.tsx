'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin', label: 'Inicio', icon: '🏠' },
  { href: '/admin/negocios', label: 'Negocios', icon: '🏢' },
  { href: '/admin/chat', label: 'Tu agente', icon: '💬' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    document.cookie = 'admin_session=; Max-Age=0; path=/';
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-card md:h-screen md:sticky md:top-0">
      <div className="p-5 border-b border-border">
        <span className="text-sm font-semibold tracking-tight text-text-primary">FactorIA</span>
        <p className="text-xs text-text-secondary mt-0.5">Panel Admin</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-3">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
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
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </a>
          );
        })}
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
          <span aria-hidden>🚪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
