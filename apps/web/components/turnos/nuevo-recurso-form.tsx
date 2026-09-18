'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function NuevoRecursoForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [subtipo, setSubtipo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/turnos/recursos', {
      method: 'POST',
      body: JSON.stringify({ nombre, subtipo }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'No se pudo crear el recurso');
      return;
    }

    setNombre('');
    setSubtipo('');
    toast.success('Recurso creado');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 mb-6">
      <div className="w-48">
        <Input
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={error ?? undefined}
        />
      </div>
      <div className="w-40">
        <Input
          label="Subtipo (opcional)"
          placeholder="ej: futbol_5"
          value={subtipo}
          onChange={(e) => setSubtipo(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Creando...' : 'Agregar recurso'}
      </Button>
    </form>
  );
}
