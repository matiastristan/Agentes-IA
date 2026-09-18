'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toggle } from '@/components/ui/toggle';

interface Servicio {
  id: string;
  nombre: string;
  subtipo: string | null;
  duracion_minutos: number;
  precio: number;
  activo: boolean;
}

export function ServiciosTable({ servicios }: { servicios: Servicio[] }) {
  const router = useRouter();
  const [valores, setValores] = useState<
    Record<string, { nombre: string; subtipo: string; precio: number; duracion: number; activo: boolean }>
  >(
    Object.fromEntries(
      servicios.map((s) => [
        s.id,
        {
          nombre: s.nombre,
          subtipo: s.subtipo ?? '',
          precio: s.precio,
          duracion: s.duracion_minutos,
          activo: s.activo,
        },
      ])
    )
  );
  const [guardando, setGuardando] = useState<string | null>(null);

  async function guardarCampo(
    id: string,
    campo: 'nombre' | 'subtipo' | 'precio' | 'duracionMinutos' | 'activo',
    valor: string | number | boolean
  ) {
    setGuardando(id);
    await fetch(`/api/turnos/servicios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [campo]: valor }),
    });
    setGuardando(null);
  }

  async function eliminarServicio(id: string) {
    if (!confirm('¿Eliminar este servicio? El agente no va a poder ofrecerlo más.')) return;
    setGuardando(id);
    await fetch(`/api/turnos/servicios/${id}`, { method: 'DELETE' });
    setGuardando(null);
    router.refresh();
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-text-secondary">
          <th className="py-2 pr-4">Nombre</th>
          <th className="py-2 pr-4">Subtipo (cancha)</th>
          <th className="py-2 pr-4">Duración (min)</th>
          <th className="py-2 pr-4">Precio</th>
          <th className="py-2 pr-4">Activo</th>
          <th className="py-2 pr-4"></th>
        </tr>
      </thead>
      <tbody>
        {servicios.map((s) => {
          const local = valores[s.id] ?? {
            nombre: s.nombre,
            subtipo: s.subtipo ?? '',
            precio: s.precio,
            duracion: s.duracion_minutos,
            activo: s.activo,
          };
          return (
            <tr key={s.id} className="border-b border-border transition-colors duration-150 ease-out hover:bg-bg-tint">
              <td className="py-2 pr-4">
                <input
                  className="w-40 rounded border border-border px-2 py-1 bg-transparent"
                  value={local.nombre}
                  disabled={guardando === s.id}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [s.id]: { ...local, nombre: e.target.value } }))
                  }
                  onBlur={(e) => guardarCampo(s.id, 'nombre', e.target.value)}
                />
              </td>
              <td className="py-2 pr-4">
                <input
                  className="w-32 rounded border border-border px-2 py-1 bg-transparent"
                  placeholder="ej: futbol_5"
                  value={local.subtipo}
                  disabled={guardando === s.id}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [s.id]: { ...local, subtipo: e.target.value } }))
                  }
                  onBlur={(e) => guardarCampo(s.id, 'subtipo', e.target.value)}
                />
              </td>
              <td className="py-2 pr-4">
                <input
                  type="number"
                  className="w-20 rounded border border-border px-2 py-1 bg-transparent"
                  value={local.duracion}
                  disabled={guardando === s.id}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [s.id]: { ...local, duracion: Number(e.target.value) } }))
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
                    setValores((prev) => ({ ...prev, [s.id]: { ...local, precio: Number(e.target.value) } }))
                  }
                  onBlur={(e) => guardarCampo(s.id, 'precio', Number(e.target.value))}
                />
              </td>
              <td className="py-2 pr-4">
                <Toggle
                  checked={local.activo}
                  disabled={guardando === s.id}
                  onCheckedChange={(value) => {
                    setValores((prev) => ({ ...prev, [s.id]: { ...local, activo: value } }));
                    guardarCampo(s.id, 'activo', value);
                  }}
                  label={`Activo: ${s.nombre}`}
                />
              </td>
              <td className="py-2 pr-4">
                <button
                  onClick={() => eliminarServicio(s.id)}
                  disabled={guardando === s.id}
                  aria-label={`Eliminar ${s.nombre}`}
                  className="text-text-muted hover:text-error text-sm"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
