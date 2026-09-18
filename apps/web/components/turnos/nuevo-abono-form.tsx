'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const selectClass =
  'h-10 rounded-md border border-border px-3 bg-background text-sm ' +
  'transition-[border-color,box-shadow] duration-150 ease-out ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

interface RecursoOption {
  id: string;
  nombre: string;
}

export function NuevoAbonoForm({ recursos }: { recursos: RecursoOption[] }) {
  const router = useRouter();
  const [recursoId, setRecursoId] = useState(recursos[0]?.id ?? '');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [diaSemana, setDiaSemana] = useState('1');
  const [horaInicio, setHoraInicio] = useState('18:00');
  const [horaFin, setHoraFin] = useState('19:00');
  const [precio, setPrecio] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recursoId || !clienteNombre.trim() || !precio) return;
    setLoading(true);

    const res = await fetch('/api/turnos/abonos', {
      method: 'POST',
      body: JSON.stringify({
        recursoId,
        clienteNombre,
        clienteTelefono: clienteTelefono || undefined,
        diaSemana: Number(diaSemana),
        horaInicio,
        horaFin,
        precio: Number(precio),
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? 'No se pudo crear el abono');
      return;
    }

    setClienteNombre('');
    setClienteTelefono('');
    setPrecio('');
    toast.success('Cliente mensualizado cargado');
    router.refresh();
  }

  if (recursos.length === 0) {
    return (
      <p className="text-sm text-text-muted mb-6">
        Primero cargá al menos un recurso (cancha) en la sección Recursos.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 mb-6">
      <div className="w-40">
        <Input label="Cliente" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
      </div>
      <div className="w-36">
        <Input
          label="Teléfono (opcional)"
          value={clienteTelefono}
          onChange={(e) => setClienteTelefono(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">Cancha</label>
        <select value={recursoId} onChange={(e) => setRecursoId(e.target.value)} className={selectClass}>
          {recursos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">Día</label>
        <select value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)} className={selectClass}>
          {DIAS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="w-24">
        <Input
          label="Desde"
          type="time"
          value={horaInicio}
          onChange={(e) => setHoraInicio(e.target.value)}
        />
      </div>
      <div className="w-24">
        <Input label="Hasta" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
      </div>
      <div className="w-28">
        <Input
          label="Precio"
          type="number"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Creando...' : 'Agregar'}
      </Button>
    </form>
  );
}
