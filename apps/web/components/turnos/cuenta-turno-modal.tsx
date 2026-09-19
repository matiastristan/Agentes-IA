'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Consumo {
  id: string;
  descripcion: string;
  precio: number;
}

interface Producto {
  id: string;
  nombre: string;
  precio: number | null;
  stock: number;
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
  productos,
  onClose,
}: {
  turno: TurnoAbierto | null;
  productos: Producto[];
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
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
    if (!turno || !productoSeleccionado) return;
    const producto = productos.find((p) => p.id === productoSeleccionado);
    if (!producto) return;
    setLoading(true);

    await fetch('/api/turnos/consumos', {
      method: 'POST',
      body: JSON.stringify({
        citaId: turno.tipo === 'cita' ? turno.id : undefined,
        abonoId: turno.tipo === 'abono' ? turno.id : undefined,
        fecha: turno.fecha,
        descripcion: producto.nombre,
        precio: producto.precio ?? 0,
        productoId: producto.id,
      }),
    });

    setProductoSeleccionado('');
    setLoading(false);
    await cargarConsumos();
  }

  async function eliminarConsumo(id: string) {
    await fetch(`/api/turnos/consumos/${id}`, { method: 'DELETE' });
    await cargarConsumos();
  }

  async function eliminarTurno() {
    if (!turno || turno.tipo !== 'cita') return;
    if (!confirm('¿Eliminar este turno?')) return;
    setCerrando(true);
    const res = await fetch(`/api/turnos/citas/${turno.id}`, { method: 'DELETE' });
    setCerrando(false);
    if (!res.ok) {
      toast.error('No se pudo eliminar el turno');
      return;
    }
    toast.success('Turno eliminado');
    onClose();
    router.refresh();
  }

  async function marcarNoShow() {
    if (!turno || turno.tipo !== 'cita') return;
    setCerrando(true);
    const res = await fetch(`/api/turnos/citas/${turno.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'no_show' }),
    });
    setCerrando(false);
    if (!res.ok) {
      toast.error('No se pudo marcar como no-show');
      return;
    }
    toast.success('Marcado como no-show');
    onClose();
    router.refresh();
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
              className="flex h-11 w-11 items-center justify-center -mr-2 -mt-2 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tint transition-colors duration-150"
            >
              <X className="h-5 w-5" aria-hidden strokeWidth={2} />
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
                    className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-error hover:bg-error-bg transition-colors duration-150"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
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
            <select
              value={productoSeleccionado}
              onChange={(e) => setProductoSeleccionado(e.target.value)}
              className="flex-1 h-10 rounded-md border border-border px-3 bg-background text-sm"
            >
              <option value="">Elegí del stock...</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                  {p.nombre} — ${p.precio ?? 0} {p.stock <= 0 ? '(sin stock)' : `(${p.stock} disp.)`}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary" disabled={loading || !productoSeleccionado}>
              +
            </Button>
          </form>
          {productos.length === 0 && (
            <p className="text-xs text-text-muted -mt-2 mb-4">
              Todavía no cargaste stock — hacelo en Configuración → Stock.
            </p>
          )}

          {turno.tipo === 'cita' && (
            <div className="flex gap-2 mb-3">
              <Button onClick={marcarNoShow} disabled={cerrando} variant="secondary" className="flex-1">
                Marcar no-show
              </Button>
              <Button onClick={eliminarTurno} disabled={cerrando} variant="secondary" className="flex-1">
                Eliminar turno
              </Button>
            </div>
          )}

          <Button onClick={cerrarCuenta} disabled={cerrando} className="w-full">
            {cerrando ? 'Enviando...' : 'Cerrar cuenta y enviar detalle por WhatsApp'}
          </Button>
        </div>
      )}
    </dialog>
  );
}
