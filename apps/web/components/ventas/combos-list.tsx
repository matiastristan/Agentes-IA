'use client';

import { useState } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';

interface ComboItem {
  producto_id: string;
  cantidad: number;
}

interface Combo {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
  productos_incluidos?: ComboItem[] | null;
}

interface ProductoRef {
  id: string;
  nombre: string;
  atributos?: Record<string, unknown>;
}

// Arma una descripción legible tipo "1× Cerveza Imperial 970cc · 2× Papas fritas"
function describirCombo(items: ComboItem[], productos: Record<string, ProductoRef>): string {
  if (!items || items.length === 0) return 'Sin productos asignados';
  return items
    .map((i) => {
      const p = productos[i.producto_id];
      if (!p) return `${i.cantidad}× Producto`;
      // Agregamos el detalle de "atributos" si el producto tiene medida/volumen cargados en el Excel
      const detalle = Object.entries(p.atributos ?? {})
        .filter(([, v]) => v && String(v).trim().length > 0)
        .map(([, v]) => String(v))
        .join(' ');
      return `${i.cantidad}× ${p.nombre}${detalle ? ` ${detalle}` : ''}`;
    })
    .join(' · ');
}

export function CombosList({
  combos,
  productos,
}: {
  combos: Combo[];
  productos: ProductoRef[];
}) {
  const [estados, setEstados] = useState<Record<string, boolean>>(
    Object.fromEntries(combos.map((c) => [c.id, c.activo]))
  );
  const [guardando, setGuardando] = useState<string | null>(null);

  const productoPorId = Object.fromEntries(productos.map((p) => [p.id, p]));

  async function toggleActivo(id: string, activo: boolean) {
    setGuardando(id);
    setEstados((prev) => ({ ...prev, [id]: activo }));
    await fetch(`/api/ventas/combos/${id}`, { method: 'PATCH', body: JSON.stringify({ activo }) });
    setGuardando(null);
  }

  if (combos.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {combos.map((c) => {
        const descripcion = describirCombo(c.productos_incluidos ?? [], productoPorId);
        return (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <CardTitle className="truncate">{c.nombre}</CardTitle>
                <p className="text-lg font-semibold text-primary mt-1">${c.precio}</p>
              </div>
              <Toggle
                checked={estados[c.id]}
                disabled={guardando === c.id}
                onCheckedChange={(v) => toggleActivo(c.id, v)}
                label={`Habilitar: ${c.nombre}`}
              />
            </div>
            <CardContent>
              <p className="text-xs text-text-secondary leading-relaxed">{descripcion}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
