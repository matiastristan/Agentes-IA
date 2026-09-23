'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, BotOff, Ban, MessageSquare } from 'lucide-react';
import { BadgeTemperatura } from '@/components/ui/badge-temperatura';
import {
  filtrarConversaciones,
  type ItemConversacion,
} from '@/lib/conversaciones/build-lista-conversaciones';
import { formatearFechaMensaje } from '@/lib/conversaciones/formatear-fecha-mensaje';
import type { Temperatura } from '@/types/crm';

const TEMPERATURAS: Temperatura[] = ['frio', 'moderado', 'caliente'];

export function ConversacionesLista({ items }: { items: ItemConversacion[] }) {
  const [busqueda, setBusqueda] = useState('');
  const visibles = useMemo(() => filtrarConversaciones(items, busqueda), [items, busqueda]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center animate-fade-slide-in">
        <MessageSquare className="mx-auto mb-2 h-6 w-6 text-text-muted" aria-hidden strokeWidth={2} />
        <p className="text-sm text-text-muted">Todavía no hay conversaciones. Van a aparecer acá apenas te escriba un cliente.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl animate-fade-slide-in">
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden
          strokeWidth={2}
        />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          aria-label="Buscar conversaciones"
          className="h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm transition-[border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        />
      </div>

      {visibles.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Ninguna conversación coincide con “{busqueda}”.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {visibles.map((c) => (
            <li key={c.id}>
              <Link
                href={`/configuracion/conversaciones/${c.id}`}
                className="flex items-start gap-3 px-4 py-3 transition-colors duration-150 ease-out hover:bg-bg-tint"
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-tint text-sm font-semibold text-primary"
                >
                  {(c.nombre ?? '#').charAt(0).toUpperCase()}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-text-primary">
                      {c.nombre ?? c.telefono}
                    </span>
                    {c.ultimoMensaje && (
                      <span className="shrink-0 text-xs text-text-muted tabular-nums">
                        {formatearFechaMensaje(c.ultimoMensaje.fecha)}
                      </span>
                    )}
                  </span>
                  {c.nombre && <span className="block text-xs text-text-muted tabular-nums">{c.telefono}</span>}
                  {c.ultimoMensaje && (
                    <span className="mt-0.5 block truncate text-sm text-text-secondary">
                      {!c.ultimoMensaje.deCliente && <span className="text-text-muted">Respuesta: </span>}
                      {c.ultimoMensaje.texto}
                    </span>
                  )}
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {c.temperatura && TEMPERATURAS.includes(c.temperatura as Temperatura) && (
                      <BadgeTemperatura value={c.temperatura as Temperatura} />
                    )}
                    {!c.botActivo && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-medium text-warning">
                        <BotOff className="h-3 w-3" aria-hidden strokeWidth={2.5} /> Bot pausado
                      </span>
                    )}
                    {c.bloqueado && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-error-bg px-2.5 py-0.5 text-xs font-medium text-error">
                        <Ban className="h-3 w-3" aria-hidden strokeWidth={2.5} /> Bloqueado
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
