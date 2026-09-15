'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Producto {
  id: string;
  nombre: string;
}

export function NuevoComboForm({ productos }: { productos: Producto[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [seleccionados, setSeleccionados] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  function toggleProducto(id: string) {
    setSeleccionados((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = 1;
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    setSeleccionados({});
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo combo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nombre del combo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Input
            label="Precio del combo"
            type="number"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text-secondary">Productos incluidos</span>
            {productos.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!seleccionados[p.id]}
                  onChange={() => toggleProducto(p.id)}
                />
                {p.nombre}
              </label>
            ))}
          </div>
          <Button type="submit" disabled={loading || !nombre || !precio}>
            {loading ? 'Guardando...' : 'Crear combo'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
