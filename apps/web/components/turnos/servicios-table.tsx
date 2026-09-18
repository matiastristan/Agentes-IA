'use client';

import { useState } from 'react';
import { Toggle } from '@/components/ui/toggle';

interface Servicio {
  id: string;
  nombre: string;
  duracion_minutos: number;
  precio: number;
  activo: boolean;
}

export function ServiciosTable({ servicios }: { servicios: Servicio[] }) {
  const [valores, setValores] = useState<Record<string, { precio: number; duracion: number; activo: boolean }>>(
    Object.fromEntries(
      servicios.map((s) => [s.id, { precio: s.precio, duracion: s.duracion_minutos, activo: s.activo }])
    )
  );
  const [guardando, setGuardando] = useState<string | null>(null);

  async function guardarCampo(id: string, campo: 'precio' | 'duracionMinutos' | 'activo', valor: number | boolean) {
    setGuardando(id);
    await fetch(`/api/turnos/servicios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [campo]: valor }),
    });
    setGuardando(null);
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-text-secondary">
          <th className="py-2 pr-4">Nombre</th>
          <th className="py-2 pr-4">Duración (min)</th>
          <th className="py-2 pr-4">Precio</th>
          <th className="py-2 pr-4">Activo</th>
        </tr>
      </thead>
      <tbody>
        {servicios.map((s) => {
          const local = valores[s.id];
          return (
            <tr key={s.id} className="border-b border-border transition-colors duration-150 ease-out hover:bg-bg-tint">
              <td className="py-2 pr-4">{s.nombre}</td>
              <td className="py-2 pr-4">
                <input
                  type="number"
                  className="w-20 rounded border border-border px-2 py-1 bg-transparent"
                  value={local.duracion}
                  disabled={guardando === s.id}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [s.id]: { ...prev[s.id], duracion: Number(e.target.value) } }))
                  }
                  onBlur={(e) => guardarCampo(s.id, 'duracionMinutos', Number(e.target.value))}
                />
              </td>
              <td className="py-2 pr-4">
                <input
                  type="number"
                  className="w-24 rounded border border-border px-2 py-1 bg-transparent"
                  value={local.precio}
                  disabled={guardando === s.id}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [s.id]: { ...prev[s.id], precio: Number(e.target.value) } }))
                  }
                  onBlur={(e) => guardarCampo(s.id, 'precio', Number(e.target.value))}
                />
              </td>
              <td className="py-2 pr-4">
                <Toggle
                  checked={local.activo}
                  disabled={guardando === s.id}
                  onCheckedChange={(value) => {
                    setValores((prev) => ({ ...prev, [s.id]: { ...prev[s.id], activo: value } }));
                    guardarCampo(s.id, 'activo', value);
                  }}
                  label={`Activo: ${s.nombre}`}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
