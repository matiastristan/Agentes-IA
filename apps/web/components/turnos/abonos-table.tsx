'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

const DIAS_LABEL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface Abono {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  activo: boolean;
  recurso_nombre: string;
}

export function AbonosTable({ abonos }: { abonos: Abono[] }) {
  const router = useRouter();
  const [guardando, setGuardando] = useState<string | null>(null);

  async function toggleActivo(id: string, activo: boolean) {
    setGuardando(id);
    await fetch(`/api/turnos/abonos/${id}`, { method: 'PATCH', body: JSON.stringify({ activo }) });
    setGuardando(null);
    router.refresh();
  }

  async function eliminar(id: string) {
    if (!confirm('¿Dar de baja este cliente mensualizado?')) return;
    setGuardando(id);
    await fetch(`/api/turnos/abonos/${id}`, { method: 'DELETE' });
    setGuardando(null);
    router.refresh();
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-text-secondary">
          <th className="py-2 pr-4">Cliente</th>
          <th className="py-2 pr-4">Cancha</th>
          <th className="py-2 pr-4">Día</th>
          <th className="py-2 pr-4">Horario</th>
          <th className="py-2 pr-4">Precio</th>
          <th className="py-2 pr-4">Activo</th>
          <th className="py-2 pr-4"></th>
        </tr>
      </thead>
      <tbody>
        {abonos.map((a) => (
          <tr key={a.id} className="border-b border-border transition-colors duration-150 ease-out hover:bg-bg-tint">
            <td className="py-2 pr-4">{a.cliente_nombre}</td>
            <td className="py-2 pr-4">{a.recurso_nombre}</td>
            <td className="py-2 pr-4">{DIAS_LABEL[a.dia_semana]}</td>
            <td className="py-2 pr-4">
              {a.hora_inicio.slice(0, 5)} - {a.hora_fin.slice(0, 5)}
            </td>
            <td className="py-2 pr-4">${a.precio}</td>
            <td className="py-2 pr-4">
              <Toggle
                checked={a.activo}
                disabled={guardando === a.id}
                onCheckedChange={(v) => toggleActivo(a.id, v)}
                label={`Activo: ${a.cliente_nombre}`}
              />
            </td>
            <td className="py-2 pr-4">
              <button
                onClick={() => eliminar(a.id)}
                disabled={guardando === a.id}
                aria-label={`Eliminar ${a.cliente_nombre}`}
                className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:text-error hover:bg-error-bg transition-colors duration-150"
              >
                <Trash2 className="h-4 w-4" aria-hidden strokeWidth={2} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
