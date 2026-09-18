'use client';

import { useState } from 'react';
import { Toggle } from '@/components/ui/toggle';

interface Recurso {
  id: string;
  nombre: string;
  subtipo: string | null;
  activo: boolean;
}

export function RecursosTable({ recursos }: { recursos: Recurso[] }) {
  const [valores, setValores] = useState<Record<string, { nombre: string; subtipo: string; activo: boolean }>>(
    Object.fromEntries(
      recursos.map((r) => [r.id, { nombre: r.nombre, subtipo: r.subtipo ?? '', activo: r.activo }])
    )
  );
  const [guardando, setGuardando] = useState<string | null>(null);

  async function guardarCampo(id: string, campo: 'nombre' | 'subtipo' | 'activo', valor: string | boolean) {
    setGuardando(id);
    await fetch(`/api/turnos/recursos/${id}`, {
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
          <th className="py-2 pr-4">Subtipo (para filtrar por tipo de cancha)</th>
          <th className="py-2 pr-4">Activo</th>
        </tr>
      </thead>
      <tbody>
        {recursos.map((r) => {
          const local = valores[r.id];
          return (
            <tr key={r.id} className="border-b border-border transition-colors duration-150 ease-out hover:bg-bg-tint">
              <td className="py-2 pr-4">
                <input
                  className="w-48 rounded border border-border px-2 py-1 bg-transparent"
                  value={local.nombre}
                  disabled={guardando === r.id}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [r.id]: { ...prev[r.id], nombre: e.target.value } }))
                  }
                  onBlur={(e) => guardarCampo(r.id, 'nombre', e.target.value)}
                />
              </td>
              <td className="py-2 pr-4">
                <input
                  className="w-40 rounded border border-border px-2 py-1 bg-transparent"
                  placeholder="ej: futbol_5"
                  value={local.subtipo}
                  disabled={guardando === r.id}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [r.id]: { ...prev[r.id], subtipo: e.target.value } }))
                  }
                  onBlur={(e) => guardarCampo(r.id, 'subtipo', e.target.value)}
                />
              </td>
              <td className="py-2 pr-4">
                <Toggle
                  checked={local.activo}
                  disabled={guardando === r.id}
                  onCheckedChange={(value) => {
                    setValores((prev) => ({ ...prev, [r.id]: { ...prev[r.id], activo: value } }));
                    guardarCampo(r.id, 'activo', value);
                  }}
                  label={`Activo: ${r.nombre}`}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
