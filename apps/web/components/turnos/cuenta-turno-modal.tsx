'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Consumo {
  id: string;
  descripcion: string;
  precio: number;
}

interface TurnoAbierto {
  tipo: 'cita' | 'abono';
  id: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  precio: number;
  hora: string;
  horaFin: string;
  fecha: string;
}

export function CuentaTurnoModal({
  turno,
  onClose,
}: {
  turno: TurnoAbierto | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [loading, setLoading] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    if (turno) {
      dialogRef.current?.showModal();
      cargarConsumos();
    } else {
      dialogRef.current?.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turno]);

  async function cargarConsumos() {
    if (!turno) return;
    const params = new URLSearchParams();
    if (turno.tipo === 'cita') params.set('cita_id', turno.id);
    else {
      params.set('abono_id', turno.id);
      params.set('fecha', turno.fecha);
    }
    const res = await fetch(`/api/turnos/consumos?${params}`);
    const data = await res.json();
    setConsumos(data.consumos ?? []);
  }

  async function agregarConsumo(e: React.FormEvent) {
    e.preventDefault();
    if (!turno || !descripcion.trim() || !precio) return;
    setLoading(true);

    await fetch('/api/turnos/consumos', {
      method: 'POST',
      body: JSON.stringify({
        citaId: turno.tipo === 'cita' ? turno.id : undefined,
        abonoId: turno.tipo === 'abono' ? turno.id : undefined,
        fecha: turno.fecha,
        descripcion,
        precio: Number(precio),
      }),
    });

    setDescripcion('');
    setPrecio('');
    setLoading(false);
    await cargarConsumos();
  }

  async function eliminarConsumo(id: string) {
    await fetch(`/api/turnos/consumos/${id}`, { method: 'DELETE' });
    await cargarConsumos();
  }

  async function cerrarCuenta() {
    if (!turno) return;
    if (!turno.clienteTelefono) {
      toast.error('Este cliente no tiene un teléfono cargado — no se puede enviar el detalle');
      return;
    }
    setCerrando(true);

    const res = await fetch('/api/turnos/cerrar-cuenta', {
      method: 'POST',
      body: JSON.stringify({
        citaId: turno.tipo === 'cita' ? turno.id : undefined,
        abonoId: turno.tipo === 'abono' ? turno.id : undefined,
        fecha: turno.fecha,
        clienteNombre: turno.clienteNombre,
        clienteTelefono: turno.clienteTelefono,
        precioBase: turno.precio,
      }),
    });
    const data = await res.json();
    setCerrando(false);

    if (!res.ok) {
      toast.error(data.error ?? 'No se pudo cerrar la cuenta');
      return;
    }

    toast.success('Detalle enviado por WhatsApp');
    onClose();
  }

  const totalConsumos = consumos.reduce((acc, c) => acc + c.precio, 0);
  const total = (turno?.precio ?? 0) + totalConsumos;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={
        'rounded-xl border border-border bg-card p-0 w-full max-w-md ' +
        'backdrop:bg-black/40 ' +
        'open:animate-[fade-slide-in_var(--duration-modal)_var(--ease-out-strong)_both]'
      }
    >
      {turno && (
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{turno.clienteNombre}</h2>
              <p className="text-sm text-text-secondary">
                {turno.hora} - {turno.horaFin}
                {turno.tipo === 'abono' && (
                  <span className="ml-2 text-xs bg-primary-tint text-primary rounded-full px-2 py-0.5">
                    Abono
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="text-text-muted hover:text-text-primary text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Turno</span>
              <span className="font-medium">${turno.precio}</span>
            </div>
            {consumos.map((c) => (
              <div key={c.id} className="flex justify-between text-sm items-center">
                <span className="text-text-secondary">{c.descripcion}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">${c.precio}</span>
                  <button
                    onClick={() => eliminarConsumo(c.id)}
                    aria-label={`Eliminar ${c.descripcion}`}
                    className="text-text-muted hover:text-error text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-base font-semibold border-t border-border pt-2 mt-1">
              <span>Total</span>
              <span>${total}</span>
            </div>
          </div>

          <form onSubmit={agregarConsumo} className="flex gap-2 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Ej: Coca Cola"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
            <div className="w-24">
              <Input
                type="number"
                placeholder="$"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={loading}>
              +
            </Button>
          </form>

          <Button onClick={cerrarCuenta} disabled={cerrando} className="w-full">
            {cerrando ? 'Enviando...' : 'Cerrar cuenta y enviar detalle por WhatsApp'}
          </Button>
        </div>
      )}
    </dialog>
  );
}
