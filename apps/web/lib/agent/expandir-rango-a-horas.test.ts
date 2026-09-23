import { describe, it, expect } from 'vitest';
import { expandirRangoAHoras } from './expandir-rango-a-horas';

describe('expandirRangoAHoras', () => {
  it('un abono de 18 a 20 devuelve las dos horas que ocupa', () => {
    expect(expandirRangoAHoras('18:00:00', '20:00:00')).toEqual(['18:00', '19:00']);
  });

  it('un abono de una sola hora devuelve solo esa hora', () => {
    expect(expandirRangoAHoras('20:00:00', '21:00:00')).toEqual(['20:00']);
  });

  it('un abono de 3 horas devuelve las tres', () => {
    expect(expandirRangoAHoras('17:00:00', '20:00:00')).toEqual(['17:00', '18:00', '19:00']);
  });

  it('un abono que termina a medianoche ocupa hasta las 23', () => {
    expect(expandirRangoAHoras('22:00:00', '00:00:00')).toEqual(['22:00', '23:00']);
  });

  it('acepta horas sin segundos', () => {
    expect(expandirRangoAHoras('18:00', '20:00')).toEqual(['18:00', '19:00']);
  });
  it('un cierre a las 23:59 incluye el turno de las 23 (así está cargado viernes y sábado)', () => {
    expect(expandirRangoAHoras('17:00', '23:59')).toEqual([
      '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
    ]);
  });

  it('un cierre a media hora no agrega un turno que se pasaría del cierre', () => {
    expect(expandirRangoAHoras('17:00', '20:30')).toEqual(['17:00', '18:00', '19:00']);
  });

  it('un horario de mañana normal no cambia', () => {
    expect(expandirRangoAHoras('10:00', '13:00')).toEqual(['10:00', '11:00', '12:00']);
  });
});
