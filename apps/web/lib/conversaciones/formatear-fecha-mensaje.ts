import { getFechaArgentina, getHoraArgentina } from '@/lib/agent/get-fecha-argentina';

/** "14:32" si es de hoy, "ayer", o "18/09" — siempre en hora de Argentina. */
export function formatearFechaMensaje(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  const diaMensaje = getFechaArgentina(fecha);
  const hoy = getFechaArgentina(ahora);
  if (diaMensaje === hoy) return getHoraArgentina(fecha);

  const ayer = getFechaArgentina(new Date(ahora.getTime() - 24 * 60 * 60 * 1000));
  if (diaMensaje === ayer) return 'ayer';

  return `${diaMensaje.slice(8, 10)}/${diaMensaje.slice(5, 7)}`;
}
