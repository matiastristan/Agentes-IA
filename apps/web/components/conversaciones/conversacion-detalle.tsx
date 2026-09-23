'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Send, Clock, AlertCircle, User } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { BadgeTemperatura } from '@/components/ui/badge-temperatura';
import { formatearFechaMensaje } from '@/lib/conversaciones/formatear-fecha-mensaje';
import { MARCA_ENVIO_MANUAL } from '@/lib/conversaciones/enviar-mensaje-manual';
import type { EstadoVentana } from '@/lib/conversaciones/ventana-24h';
import type { Temperatura } from '@/types/crm';
import { cn } from '@/lib/utils';

interface Mensaje {
  id: string;
  role: string;
  content: string;
  tool_called: string | null;
  status: string | null;
  status_error: string | null;
  created_at: string;
}

// Mientras la conversación está abierta, se refresca sola para ver los
// mensajes nuevos del cliente sin recargar la página.
const REFRESCO_MS = 15_000;
const MAX_CARACTERES = 4096;

export function ConversacionDetalle(props: {
  id: string;
  telefono: string;
  nombre: string | null;
  temperatura: string | null;
  botActivo: boolean;
  bloqueado: boolean;
  mensajes: Mensaje[];
  ventana: EstadoVentana;
}) {
  const router = useRouter();
  const [botActivo, setBotActivo] = useState(props.botActivo);
  const [bloqueado, setBloqueado] = useState(props.bloqueado);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  // Si el servidor trae un estado nuevo (por el refresco), lo reflejamos.
  useEffect(() => setBotActivo(props.botActivo), [props.botActivo]);
  useEffect(() => setBloqueado(props.bloqueado), [props.bloqueado]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' });
  }, [props.mensajes.length]);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, REFRESCO_MS);
    return () => window.clearInterval(intervalo);
  }, [router]);

  async function cambiarBot(activo: boolean) {
    setGuardando(true);
    setBotActivo(activo);
    const res = await fetch(`/api/conversaciones/${props.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botActivo: activo }),
    });
    setGuardando(false);
    if (!res.ok) {
      setBotActivo(!activo);
      toast.error('No se pudo cambiar el estado del bot');
      return;
    }
    toast.success(activo ? 'Bot activado en esta conversación' : 'Bot pausado: ahora respondés vos');
    router.refresh();
  }

  async function cambiarBloqueo(nuevo: boolean) {
    if (nuevo && !confirm('¿Bloquear este número? El agente va a ignorar todos sus mensajes.')) return;
    setGuardando(true);
    setBloqueado(nuevo);
    const res = await fetch(`/api/conversaciones/${props.id}/bloqueo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bloqueado: nuevo }),
    });
    setGuardando(false);
    if (!res.ok) {
      setBloqueado(!nuevo);
      toast.error('No se pudo actualizar el bloqueo');
      return;
    }
    toast.success(nuevo ? 'Número bloqueado' : 'Número desbloqueado');
    router.refresh();
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido || enviando) return;

    setEnviando(true);
    const res = await fetch(`/api/conversaciones/${props.id}/mensajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: contenido }),
    });
    const data = await res.json().catch(() => ({}));
    setEnviando(false);

    if (!res.ok) {
      toast.error(data.error ?? 'No se pudo enviar el mensaje');
      router.refresh(); // si falló en WhatsApp, igual aparece en el historial como no entregado
      return;
    }
    setTexto('');
    setBotActivo(false);
    toast.success('Enviado. El bot quedó pausado en esta conversación.');
    router.refresh();
  }

  const puedeEscribir = props.ventana.abierta && !bloqueado;

  return (
    <main className="flex flex-1 flex-col bg-background">
      {/* Encabezado */}
      <header className="border-b border-border bg-card px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/configuracion/conversaciones"
            aria-label="Volver a conversaciones"
            className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors duration-150 hover:bg-bg-tint hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-text-primary">{props.nombre ?? props.telefono}</h1>
            {props.nombre && <p className="text-xs text-text-muted tabular-nums">{props.telefono}</p>}
          </div>
          {props.temperatura && ['frio', 'moderado', 'caliente'].includes(props.temperatura) && (
            <BadgeTemperatura value={props.temperatura as Temperatura} />
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <Toggle checked={botActivo} onCheckedChange={cambiarBot} disabled={guardando} label="Bot activo" />
            {botActivo ? 'Bot respondiendo' : 'Bot pausado'}
          </label>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <Toggle checked={bloqueado} onCheckedChange={cambiarBloqueo} disabled={guardando} label="Bloquear número" />
            {bloqueado ? 'Número bloqueado' : 'Bloquear número'}
          </label>
        </div>
      </header>

      {/* Historial */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6" aria-live="polite">
        {props.mensajes.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">No hay mensajes en esta conversación.</p>
        ) : (
          <ol className="mx-auto flex max-w-3xl flex-col gap-2">
            {props.mensajes.map((m) => {
              const deCliente = m.role === 'user';
              const manual = m.tool_called === MARCA_ENVIO_MANUAL;
              const fallido = m.status === 'failed';
              return (
                <li key={m.id} className={cn('flex', deCliente ? 'justify-start' : 'justify-end')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
                      deCliente && 'rounded-bl-sm border border-border bg-card text-text-primary',
                      !deCliente && !manual && 'rounded-br-sm bg-primary-tint text-text-primary',
                      manual && 'rounded-br-sm bg-primary text-primary-foreground',
                      fallido && 'ring-1 ring-error'
                    )}
                  >
                    {manual && (
                      <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold opacity-80">
                        <User className="h-3 w-3" aria-hidden strokeWidth={2.5} /> Vos
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={cn('mt-1 text-right text-[11px] tabular-nums', manual ? 'opacity-75' : 'text-text-muted')}>
                      {formatearFechaMensaje(m.created_at)}
                    </p>
                    {fallido && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-error">
                        <AlertCircle className="h-3 w-3" aria-hidden strokeWidth={2.5} />
                        No se entregó{m.status_error ? `: ${m.status_error}` : ''}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={finRef} />
      </div>

      {/* Envío manual */}
      <footer className="border-t border-border bg-card px-4 py-3 md:px-6">
        <div className="mx-auto max-w-3xl">
          {bloqueado ? (
            <p className="text-sm text-text-muted">Desbloqueá el número para poder escribirle.</p>
          ) : !props.ventana.abierta ? (
            <p className="flex items-start gap-2 text-sm text-text-secondary">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden strokeWidth={2} />
              Pasaron más de 24 horas desde el último mensaje del cliente. WhatsApp no permite escribirle hasta que
              vuelva a escribir él.
            </p>
          ) : (
            <form onSubmit={enviar} className="flex items-end gap-2">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  // Enter envía, Shift+Enter hace salto de línea (como en WhatsApp Web)
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={MAX_CARACTERES}
                placeholder="Escribile al cliente..."
                aria-label="Mensaje para el cliente"
                disabled={!puedeEscribir || enviando}
                className="max-h-40 min-h-11 flex-1 resize-y rounded-md border border-border bg-background px-3 py-2.5 text-sm transition-[border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              />
              <Button type="submit" disabled={!texto.trim() || enviando} aria-label="Enviar mensaje" className="h-11">
                <Send className="h-4 w-4" aria-hidden strokeWidth={2} />
              </Button>
            </form>
          )}
          {puedeEscribir && (
            <p className="mt-1.5 text-xs text-text-muted">
              {props.ventana.abierta && props.ventana.horasRestantes < 3
                ? `Te quedan menos de ${props.ventana.horasRestantes + 1} h para responderle por WhatsApp. `
                : ''}
              Al responder vos, el bot se pausa en esta conversación.
            </p>
          )}
        </div>
      </footer>
    </main>
  );
}
