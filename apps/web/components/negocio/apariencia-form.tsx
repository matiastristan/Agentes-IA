'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const PALETAS = [
  { key: 'apple', label: 'Apple Modern', swatches: ['#F5F5F7', '#1D1D1F', '#AAAAAA', '#007AFF'] },
  { key: 'notion', label: 'Notion Minimal', swatches: ['#F7F6F3', '#D9D0C7', '#373737', '#E07A5F'] },
  { key: 'spotify', label: 'Spotify Fresh', swatches: ['#1DB954', '#0D2818', '#D1FADF', '#121212'] },
];

export function AparienciaForm({ colorPaletteActual }: { colorPaletteActual: string }) {
  const router = useRouter();
  const [colorPalette, setColorPalette] = useState(colorPaletteActual);
  const [loading, setLoading] = useState(false);

  async function guardar(nuevaPaleta: string) {
    setColorPalette(nuevaPaleta);
    setLoading(true);
    const res = await fetch('/api/negocio/configuracion-agente', {
      method: 'POST',
      body: JSON.stringify({ color_palette: nuevaPaleta }),
    });
    setLoading(false);

    if (!res.ok) {
      toast.error('No se pudo guardar');
      return;
    }
    toast.success('Paleta aplicada');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {PALETAS.map((p) => (
        <button
          key={p.key}
          type="button"
          disabled={loading}
          onClick={() => guardar(p.key)}
          className={
            'flex items-center gap-4 rounded-lg border p-4 text-left transition-[transform,box-shadow] duration-150 ease-out ' +
            (colorPalette === p.key
              ? 'border-primary shadow-md -translate-y-0.5'
              : 'border-border hover:-translate-y-0.5')
          }
        >
          <div className="flex -space-x-2">
            {p.swatches.map((color, i) => (
              <span
                key={i}
                aria-hidden
                className="h-9 w-9 rounded-full border-2 border-card"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-text-primary">{p.label}</span>
          {colorPalette === p.key && (
            <span className="ml-auto text-xs text-primary font-medium">Activa</span>
          )}
        </button>
      ))}
    </div>
  );
}
