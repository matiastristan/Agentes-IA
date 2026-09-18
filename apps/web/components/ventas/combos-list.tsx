'use client';

import { useState } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';

interface Combo {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
}

export function CombosList({ combos }: { combos: Combo[] }) {
  const [estados, setEstados] = useState<Record<string, boolean>>(
    Object.fromEntries(combos.map((c) => [c.id, c.activo]))
  );
  const [guardando, setGuardando] = useState<string | null>(null);

  async function toggleActivo(id: string, activo: boolean) {
    setGuardando(id);
    setEstados((prev) => ({ ...prev, [id]: activo }));
    await fetch(`/api/ventas/combos/${id}`, { method: 'PATCH', body: JSON.stringify({ activo }) });
    setGuardando(null);
  }

  if (combos.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {combos.map((c) => (
        <Card key={c.id}>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>{c.nombre}</CardTitle>
            <Toggle
              checked={estados[c.id]}
              disabled={guardando === c.id}
              onCheckedChange={(v) => toggleActivo(c.id, v)}
              label={`Habilitar: ${c.nombre}`}
            />
          </div>
          <CardContent>
            <p className="text-sm text-text-secondary">${c.precio}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
