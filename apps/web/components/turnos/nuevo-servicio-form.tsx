'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function NuevoServicioForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [duracionMinutos, setDuracionMinutos] = useState('60');
  const [precio, setPrecio] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const res = await fetch('/api/turnos/servicios', {
      method: 'POST',
      body: JSON.stringify({
        nombre,
        duracionMinutos: Number(duracionMinutos),
        precio: Number(precio),
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (data.errors) setErrors(data.errors);
      toast.error(data.error ?? 'No se pudo crear el servicio');
      return;
    }

    setNombre('');
    setPrecio('');
    toast.success('Servicio creado');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 mb-6">
      <div className="w-48">
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} error={errors.nombre} />
      </div>
      <div className="w-32">
        <Input
          label="Duración (min)"
          type="number"
          value={duracionMinutos}
          onChange={(e) => setDuracionMinutos(e.target.value)}
          error={errors.duracionMinutos}
        />
      </div>
      <div className="w-32">
        <Input
          label="Precio"
          type="number"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          error={errors.precio}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Creando...' : 'Agregar servicio'}
      </Button>
    </form>
  );
}
