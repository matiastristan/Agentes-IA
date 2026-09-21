'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { buildCalendarioSlots } from '@/lib/turnos/build-calendario-slots';
import { CuentaTurnoModal } from './cuenta-turno-modal';
import { NuevaCitaManualModal } from './nueva-cita-manual-modal';
import { colorParaSubtipo } from '@/lib/turnos/color-para-subtipo';
import { fondoParaEstadoTurno } from '@/lib/turnos/fondo-para-estado-turno';
import { cn } from '@/lib/utils';

interface RecursoRaw {
  id: string;
  nombre: string;
  subtipo: string | null;
}

interface CitaRaw {
  id: string;
  recurso_id: string | null;
  hora: string;
  customer_name: string | null;
  customer_id: string;
  servicio: { duracion_minutos: number; precio: number } | null;
}

interface AbonoRaw {
  id: string;
  recurso_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  precio: number;
}

interface ProductoRaw {
  id: string;
  nombre: string;
  precio: number | null;
  stock: number;
}

interface ServicioOption {
  id: string;
  nombre: string;
  precio: number;
}

interface TurnoAbierto {
  tipo: 'cita' | 'abono';
  estado?: string;
  id: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  precio: number;
  hora: string;
  horaFin: string;
  fecha: string;
}

interface SlotVacio {
  fecha: string;
  hora: string;
  recursoId: string;
  recursoNombre: string;
}

interface ComboRaw {
  id: string;
  nombre: string;
  precio: number;
}

export function CalendarioClient({
  fecha,
  diaSemana,
  horarioDelDia,
  recursos,
  citas,
  abonos,
  productos,
  combos,
  servicios,
  subtipoActual,
}: {
  fecha: string;
  diaSemana: number;
  horarioDelDia: string | undefined;
  recursos: RecursoRaw[];
  citas: CitaRaw[];
  abonos: AbonoRaw[];
  productos: ProductoRaw[];
  combos: ComboRaw[];
  servicios: ServicioOption[];
  subtipoActual: string | null;
}) {
  const router = useRouter();
  const [turnoAbierto, setTurnoAbierto] = useState<TurnoAbierto | null>(null);
  const [slotVacio, setSlotVacio] = useState<SlotVacio | null>(null);

  const subtiposDisponibles = useMemo(
    () => Array.from(new Set(recursos.map((r) => r.subtipo).filter(Boolean))) as string[],
    [recursos]
  );

  const slots = useMemo(
    () =>
      buildCalendarioSlots({
        fecha,
        diaSemana,
        horarioDelDia,
        recursos,
        subtipoFiltro: subtipoActual,
        citas,
        abonos,
      }),
    [fecha, diaSemana, horarioDelDia, recursos, subtipoActual, citas, abonos]
  );

  function cambiarFecha(nuevaFecha: string) {
    const params = new URLSearchParams();
    params.set('fecha', nuevaFecha);
    if (subtipoActual) params.set('cancha', subtipoActual);
    router.push(`/turnos?${params}`);
  }

  function cambiarSubtipo(nuevoSubtipo: string) {
    const params = new URLSearchParams();
    params.set('fecha', fecha);
    if (nuevoSubtipo) params.set('cancha', nuevoSubtipo);
    router.push(`/turnos?${params}`);
  }

  function irADia(delta: number) {
    const d = new Date(`${fecha}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta);
    cambiarFecha(d.toISOString().slice(0, 10));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-slide-in">
        <div className="flex items-center gap-1">
          <button
            onClick={() => irADia(-1)}
            aria-label="Día anterior"
            className="h-9 w-9 rounded-md border border-border hover:bg-bg-tint transition-colors duration-150"
          >
            ←
          </button>
          <input
            type="date"
            value={fecha}
            onChange={(e) => cambiarFecha(e.target.value)}
            className="h-9 rounded-md border border-border px-3 text-sm bg-background"
          />
          <button
            onClick={() => irADia(1)}
            aria-label="Día siguiente"
            className="h-9 w-9 rounded-md border border-border hover:bg-bg-tint transition-colors duration-150"
          >
            →
          </button>
        </div>

        {subtiposDisponibles.length > 0 && (
          <select
            value={subtipoActual ?? ''}
            onChange={(e) => cambiarSubtipo(e.target.value)}
            className="h-9 rounded-md border border-border px-3 text-sm bg-background"
          >
            <option value="">Todas las canchas</option>
            {subtiposDisponibles.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        )}
      </div>

      {slots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center animate-fade-slide-in">
          <p className="text-sm text-text-muted">
            No hay canchas de ese tipo cargadas — agregalas en Recursos.
          </p>
        </div>
      ) : slots.every((s) => s.horas.length === 0) ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center animate-fade-slide-in">
          <p className="text-sm text-text-muted">El negocio no atiende este día.</p>
        </div>
      ) : (
        <div className="overflow-x-auto animate-fade-slide-in">
          <div className="flex gap-4 min-w-max pb-2">
            {slots.map((s) => (
              <div key={s.recurso.id} className="w-52">
                <h3 className="text-sm font-semibold text-text-primary mb-2">{s.recurso.nombre}</h3>
                <div className="flex flex-col gap-2">
                  {s.horas.map((h) => (
                    <button
                      key={h.hora}
                      onClick={() =>
                        h.turno
                          ? setTurnoAbierto({
                              tipo: h.turno.tipo,
                              id: h.turno.id,
                              clienteNombre: h.turno.clienteNombre,
                              clienteTelefono: h.turno.clienteTelefono,
                              precio: h.turno.precio,
                              hora: h.hora,
                              horaFin: h.turno.horaFin,
                              fecha,
                            })
                          : setSlotVacio({
                              fecha,
                              hora: h.hora,
                              recursoId: s.recurso.id,
                              recursoNombre: s.recurso.nombre,
                            })
                      }
                      className={cn(
                        'text-left rounded-lg border p-3 text-sm transition-[transform,box-shadow] duration-150 ease-out',
                        h.ocupado && h.turno
                          ? cn(
                              'hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
                              fondoParaEstadoTurno(h.turno.tipo, h.turno.estado),
                              colorParaSubtipo(s.recurso.subtipo)
                            )
                          : 'border-dashed border-border text-text-muted hover:border-primary hover:text-text-primary cursor-pointer'
                      )}
                    >
                      <p className="font-medium">{h.hora}</p>
                      {h.turno ? (
                        <>
                          <p className="text-text-primary truncate">{h.turno.clienteNombre}</p>
                          {h.turno.clienteTelefono && (
                            <p className="text-xs text-text-secondary tabular-nums">
                              {h.turno.clienteTelefono}
                            </p>
                          )}
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="text-xs text-text-secondary">${h.turno.precio}</span>
                            {h.turno.tipo === 'abono' && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                                Mensual
                              </span>
                            )}
                            {h.turno.estado === 'completada' && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-success">
                                Pagado
                              </span>
                            )}
                            {h.turno.estado === 'no_show' && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-error">
                                No vino
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs">+ Cargar turno</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CuentaTurnoModal
        turno={turnoAbierto}
        productos={productos}
        combos={combos}
        onClose={() => setTurnoAbierto(null)}
      />
      <NuevaCitaManualModal slot={slotVacio} servicios={servicios} onClose={() => setSlotVacio(null)} />
    </div>
  );
}
