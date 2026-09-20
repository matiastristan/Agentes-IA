'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'factoria-theme';

export function ThemeToggle() {
  // Arranca en null hasta leer el valor real: así el botón no muestra
  // el estado equivocado durante la hidratación.
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    setIsDark(guardado === 'dark');
  }, []);

  function toggle() {
    const siguiente = !isDark;
    setIsDark(siguiente);

    const root = document.documentElement;

    // Transición suave de colores solo durante el cambio — después se quita,
    // para que las interacciones normales (hover, focus) sigan siendo instantáneas.
    root.style.setProperty('--theme-transition', 'background-color 220ms ease, color 220ms ease, border-color 220ms ease');
    window.setTimeout(() => root.style.removeProperty('--theme-transition'), 260);

    if (siguiente) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem(STORAGE_KEY, 'dark');
    } else {
      root.removeAttribute('data-theme');
      localStorage.setItem(STORAGE_KEY, 'light');
    }
  }

  const activo = isDark ?? false;

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={activo}
      aria-label={activo ? 'Desactivar modo oscuro' : 'Activar modo oscuro'}
      className={cn(
        'relative inline-flex h-11 w-[76px] shrink-0 items-center rounded-full border px-1',
        'transition-colors duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        activo ? 'bg-primary border-primary' : 'bg-bg-tint border-border'
      )}
    >
      {/* Íconos de fondo, uno a cada lado */}
      <Sun
        className={cn(
          'absolute left-2.5 h-4 w-4 transition-opacity duration-200',
          activo ? 'opacity-40 text-primary-foreground' : 'opacity-0'
        )}
        aria-hidden
        strokeWidth={2.5}
      />
      <Moon
        className={cn(
          'absolute right-2.5 h-4 w-4 transition-opacity duration-200',
          activo ? 'opacity-0' : 'opacity-40 text-text-muted'
        )}
        aria-hidden
        strokeWidth={2.5}
      />

      {/* Perilla que se desliza */}
      <span
        className={cn(
          'relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm',
          'transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]',
          activo ? 'translate-x-[34px]' : 'translate-x-0'
        )}
      >
        {activo ? (
          <Moon className="h-4 w-4 text-primary" aria-hidden strokeWidth={2.5} />
        ) : (
          <Sun className="h-4 w-4 text-warning" aria-hidden strokeWidth={2.5} />
        )}
      </span>
    </button>
  );
}
