'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const DIAS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

const inputClass =
  'h-10 rounded-md border border-border px-3 bg-background text-sm w-full ' +
  'transition-[border-color,box-shadow] duration-150 ease-out ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

const PALETAS = [
  { key: 'warm', label: 'Cálida', swatch: '#EF6B4B' },
  { key: 'cool', label: 'Fría', swatch: '#4B5EFC' },
  { key: 'vibrant', label: 'Vibrante', swatch: '#10B981' },
  { key: 'lavanda', label: 'Lavanda x Beige', swatch: '#A89BBE' },
];

export function ConfiguracionAgenteForm({
  tonoVozActual,
  horariosActuales,
  instruccionesActuales,
  colorPaletteActual,
}: {
  tonoVozActual: string;
  horariosActuales: Record<string, string>;
  instruccionesActuales: string;
  colorPaletteActual: string;
}) {
  const router = useRouter();
  const [tonoVoz, setTonoVoz] = useState(tonoVozActual);
  const [horarios, setHorarios] = useState<Record<string, string>>(horariosActuales);
  const [instrucciones, setInstrucciones] = useState(instruccionesActuales);
  const [colorPalette, setColorPalette] = useState(colorPaletteActual);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/negocio/configuracion-agente', {
      method: 'POST',
      body: JSON.stringify({
        tono_voz: tonoVoz,
        horarios,
        instrucciones_adicionales: instrucciones,
        color_palette: colorPalette,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      toast.error('No se pudo guardar');
      return;
    }

    toast.success('Guardado — tu agente ya usa esta configuración');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">Tono de voz del agente</label>
        <select value={tonoVoz} onChange={(e) => setTonoVoz(e.target.value)} className={inputClass}>
          <option value="casual">Casual</option>
          <option value="profesional y amable">Profesional y amable</option>
          <option value="formal">Formal</option>
          <option value="divertido">Divertido / con humor</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary">Horarios de atención</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DIAS.map((dia) => (
            <div key={dia.key} className="flex items-center gap-2">
              <span className="text-sm w-24 text-text-secondary">{dia.label}</span>
              <input
                className={inputClass}
                placeholder="ej: 09:00-18:00 (vacío = cerrado)"
                value={horarios[dia.key] ?? ''}
                onChange={(e) => setHorarios((prev) => ({ ...prev, [dia.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">
          Instrucciones adicionales para el agente
        </label>
        <p className="text-xs text-text-muted mb-1">
          Reglas de negocio, cómo tratar casos especiales, cosas que siempre tiene que decir o
          nunca decir. Los precios y horarios siempre los toma de los datos reales que cargaste
          arriba y en Servicios/Recursos — esto no los reemplaza.
        </p>
        <textarea
          className={inputClass + ' h-32 resize-y py-2'}
          value={instrucciones}
          onChange={(e) => setInstrucciones(e.target.value)}
          placeholder="ej: Los sábados no se hacen descuentos. Si preguntan por cancelaciones, avisar que hay que avisar con 24hs de anticipación."
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary">Paleta de colores</label>
        <div className="flex gap-3">
          {PALETAS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setColorPalette(p.key)}
              className={
                'flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-[transform,box-shadow] duration-150 ease-out ' +
                (colorPalette === p.key
                  ? 'border-primary shadow-md -translate-y-0.5'
                  : 'border-border hover:-translate-y-0.5')
              }
            >
              <span
                aria-hidden
                className="h-8 w-8 rounded-full"
                style={{ backgroundColor: p.swatch }}
              />
              <span className="text-xs text-text-secondary">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={loading} className="self-start">
        {loading ? 'Guardando...' : 'Guardar configuración'}
      </Button>
    </form>
  );
}
