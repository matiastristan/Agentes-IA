'use client';

import { useState } from 'react';
import { checkStockAlert } from '@/lib/ventas/check-stock-alert';

interface Producto {
  id: string;
  nombre: string;
  precio: number | null;
  stock: number;
  umbral_alerta_stock: number | null;
  atributos: Record<string, unknown>;
}

export function CatalogoTable({
  productos,
  columnasDinamicas,
}: {
  productos: Producto[];
  columnasDinamicas: string[];
}) {
  const [valores, setValores] = useState<Record<string, { precio: number | null; stock: number }>>(
    Object.fromEntries(productos.map((p) => [p.id, { precio: p.precio, stock: p.stock }]))
  );
  const [guardando, setGuardando] = useState<string | null>(null);

  async function guardarCampo(id: string, campo: 'precio' | 'stock', valor: number) {
    setGuardando(id);
    await fetch(`/api/ventas/productos/${id}`, {
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
          <th className="py-2 pr-4">Precio</th>
          <th className="py-2 pr-4">Stock</th>
          {columnasDinamicas.map((col) => (
            <th key={col} className="py-2 pr-4 capitalize">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {productos.map((p) => {
          const local = valores[p.id];
          const alerta = checkStockAlert(local.stock, p.umbral_alerta_stock ?? null);
          return (
            <tr key={p.id} className="border-b border-border">
              <td className="py-2 pr-4">{p.nombre}</td>
              <td className="py-2 pr-4">
                <input
                  type="number"
                  className="w-24 rounded border border-border px-2 py-1 bg-transparent"
                  value={local.precio ?? ''}
                  disabled={guardando === p.id}
                  onChange={(e) =>
                    setValores((prev) => ({
                      ...prev,
                      [p.id]: { ...prev[p.id], precio: e.target.value === '' ? null : Number(e.target.value) },
                    }))
                  }
                  onBlur={(e) => guardarCampo(p.id, 'precio', Number(e.target.value))}
                />
              </td>
              <td className="py-2 pr-4">
                <input
                  type="number"
                  className="w-20 rounded border border-border px-2 py-1 bg-transparent"
                  value={local.stock}
                  disabled={guardando === p.id}
                  onChange={(e) =>
                    setValores((prev) => ({
                      ...prev,
                      [p.id]: { ...prev[p.id], stock: Number(e.target.value) },
                    }))
                  }
                  onBlur={(e) => guardarCampo(p.id, 'stock', Number(e.target.value))}
                />
                {alerta.requiereAlerta && (
                  <span className="ml-2 text-xs text-warning">⚠️ stock bajo</span>
                )}
              </td>
              {columnasDinamicas.map((col) => (
                <td key={col} className="py-2 pr-4">
                  {String(p.atributos[col] ?? '')}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
