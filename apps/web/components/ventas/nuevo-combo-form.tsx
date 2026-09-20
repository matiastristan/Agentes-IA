'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Plus, Minus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Producto {
  id: string;
  nombre: string;
  precio: number | null;
  rubro: string | null;
  atributos: unknown;
}

export function NuevoComboForm({ productos }: { productos: Producto[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const resultados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    if (!query) return productos.slice(0, 8);
    return productos
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(query) ||
          (p.rubro ?? '').toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [productos, busqueda]);

  const productoPorId = useMemo(
    () => Object.fromEntries(productos.map((p) => [p.id, p])),
    [productos]
  );

  function ajustarCantidad(id: string, delta: number) {
    setSeleccionados((prev) => {
      const actual = prev[id] ?? 0;
      const nuevo = actual + delta;
      const next = { ...prev };
      if (nuevo <= 0) delete next[id];
      else next[id] = nuevo;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre || !precio || Object.keys(seleccionados).length === 0) return;
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const productosIncluidos = Object.entries(seleccionados).map(([producto_id, cantidad]) => ({
      producto_id,
      cantidad,
    }));

    await supabase.from('combos').insert({
      tenant_id: user!.id,
      nombre,
      precio: Number(precio),
      productos_incluidos: productosIncluidos,
    });

    setLoading(false);
    setNombre('');
    setPrecio('');
    setBusqueda('');
    setSeleccionados({});
    router.refresh();
  }

  const seleccionadosIds = Object.keys(seleccionados);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo combo o promoción</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre del combo"
              placeholder="Ej: Combo cervecero"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <Input
              label="Precio final del combo"
              type="number"
              placeholder="$"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">Productos incluidos</label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
                aria-hidden
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Buscar producto por nombre o rubro..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm transition-[border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              />
            </div>

            {resultados.length === 0 ? (
              <p className="text-xs text-text-muted py-2">No hay productos que coincidan.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border border border-border rounded-md">
                {resultados.map((p) => {
                  const cantidad = seleccionados[p.id] ?? 0;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div className="flex flex-col min-w-0">
                        <span className="text-text-primary truncate">{p.nombre}</span>
                        {(p.rubro || p.precio != null) && (
                          <span className="text-xs text-text-muted">
                            {p.rubro ? `${p.rubro}` : ''}
                            {p.rubro && p.precio != null ? ' · ' : ''}
                            {p.precio != null ? `$${p.precio}` : ''}
                          </span>
                        )}
                      </div>
                      {cantidad === 0 ? (
                        <button
                          type="button"
                          onClick={() => ajustarCantidad(p.id, 1)}
                          className="flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs hover:border-primary hover:text-primary transition-colors duration-150"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          Agregar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => ajustarCantidad(p.id, -1)}
                            aria-label="Quitar uno"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-primary transition-colors duration-150"
                          >
                            <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                          <span className="text-sm font-medium tabular-nums w-6 text-center">{cantidad}</span>
                          <button
                            type="button"
                            onClick={() => ajustarCantidad(p.id, 1)}
                            aria-label="Agregar uno más"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-primary transition-colors duration-150"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {seleccionadosIds.length > 0 && (
            <div className="rounded-md bg-primary-tint/30 p-3">
              <p className="text-xs font-medium text-text-secondary mb-1.5">Incluye:</p>
              <div className="flex flex-wrap gap-1.5">
                {seleccionadosIds.map((id) => {
                  const p = productoPorId[id];
                  if (!p) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2 py-0.5 text-xs"
                    >
                      {seleccionados[id]}× {p.nombre}
                      <button
                        type="button"
                        onClick={() => ajustarCantidad(id, -seleccionados[id])}
                        aria-label={`Quitar ${p.nombre}`}
                        className="text-text-muted hover:text-error"
                      >
                        <X className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !nombre || !precio || seleccionadosIds.length === 0}
            className="self-start"
          >
            {loading ? 'Guardando...' : 'Crear combo'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
