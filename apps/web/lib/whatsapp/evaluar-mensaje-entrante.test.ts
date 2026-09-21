import { describe, it, expect } from 'vitest';
import { evaluarMensajeEntrante } from './evaluar-mensaje-entrante';

const AHORA = new Date('2026-09-21T02:40:00Z');
const segundos = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe('evaluarMensajeEntrante', () => {
  it('un mensaje nuevo y reciente se procesa', () => {
    expect(
      evaluarMensajeEntrante({
        timestampSeg: segundos('2026-09-21T02:39:50Z'),
        yaProcesado: false,
        ahora: AHORA,
      })
    ).toBe('procesar');
  });

  it('un mensaje que ya procesamos (Meta lo reenvió) se descarta como duplicado', () => {
    expect(
      evaluarMensajeEntrante({
        timestampSeg: segundos('2026-09-21T02:39:50Z'),
        yaProcesado: true,
        ahora: AHORA,
      })
    ).toBe('duplicado');
  });

  it('un mensaje de hace horas (reintento acumulado de Meta) se descarta como viejo', () => {
    // El caso real: "Mi nombre es josue" enviado ayer, procesado a las 5 AM
    expect(
      evaluarMensajeEntrante({
        timestampSeg: segundos('2026-09-20T23:00:00Z'),
        yaProcesado: false,
        ahora: AHORA,
      })
    ).toBe('viejo');
  });

  it('un mensaje de hace 5 minutos todavía se procesa (demoras normales de red)', () => {
    expect(
      evaluarMensajeEntrante({
        timestampSeg: segundos('2026-09-21T02:35:00Z'),
        yaProcesado: false,
        ahora: AHORA,
      })
    ).toBe('procesar');
  });

  it('el duplicado tiene prioridad sobre el chequeo de antigüedad', () => {
    expect(
      evaluarMensajeEntrante({
        timestampSeg: segundos('2026-09-20T23:00:00Z'),
        yaProcesado: true,
        ahora: AHORA,
      })
    ).toBe('duplicado');
  });

  it('sin timestamp (payload raro) no lo descarta por viejo', () => {
    expect(
      evaluarMensajeEntrante({ timestampSeg: undefined, yaProcesado: false, ahora: AHORA })
    ).toBe('procesar');
  });
});
