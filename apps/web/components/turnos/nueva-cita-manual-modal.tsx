'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ServicioOption {
  id: string;
  nombre: string;
  precio: number;
}

interface SlotVacio {
  fecha: string;
  hora: string;
  recursoId: string;
  recursoNombre: string;
}

export function NuevaCitaManualModal({
  slot,
  servicios,
  onClose,
}: {
  slot: SlotVacio | null;
  servicios: ServicioOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (slot) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
      setClienteNombre('');
      setClienteTelefono('');
      setServicioId('');
    }
  }, [slot]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slot || !clienteNombre.trim()) return;
    setLoading(true);

    const res = await fetch('/api/turnos/citas-manual', {
      method: 'POST',
      body: JSON.stringify({
        fecha: slot.fecha,
        hora: slot.hora,
        recursoId: slot.recursoId,
        servicioId: servicioId || undefined,
        clienteNombre,
        clienteTelefono: clienteTelefono || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? 'No se pudo crear el turno');
      return;
    }

    toast.success('Turno cargado');
    onClose();
    router.refresh();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={
        'rounded-xl border border-border bg-card p-0 w-full max-w-sm ' +
        'backdrop:bg-black/40 ' +
        'open:animate-[fade-slide-in_var(--duration-modal)_var(--ease-out-strong)_both]'
      }
    >
      {slot && (
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Nuevo turno</h2>
              <p className="text-sm text-text-secondary">
                {slot.recursoNombre} — {slot.hora}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-11 w-11 items-center justify-center -mr-2 -mt-2 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tint transition-colors duration-150"
            >
              <X className="h-5 w-5" aria-hidden strokeWidth={2} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nombre del cliente"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
            />
            <Input
              label="Teléfono (opcional)"
              placeholder="Para poder mandarle el detalle al cerrar"
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value)}
            />
            {servicios.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-secondary">
                  Servicio (opcional)
                </label>
                <select
                  value={servicioId}
                  onChange={(e) => setServicioId(e.target.value)}
                  className="h-10 rounded-md border border-border px-3 bg-background text-sm"
                >
                  <option value="">Sin especificar</option>
                  {servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} — ${s.precio}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button type="submit" disabled={loading || !clienteNombre.trim()}>
              {loading ? 'Guardando...' : 'Cargar turno'}
            </Button>
          </form>
        </div>
      )}
    </dialog>
  );
}
