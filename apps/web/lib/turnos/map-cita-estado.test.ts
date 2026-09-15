import { describe, it, expect } from 'vitest';
import { mapCitaEstadoToTurnoCardEstado } from './map-cita-estado';

describe('mapCitaEstadoToTurnoCardEstado', () => {
  it('confirmada y pendiente se muestran como ocupado', () => {
    expect(mapCitaEstadoToTurnoCardEstado('confirmada')).toBe('ocupado');
    expect(mapCitaEstadoToTurnoCardEstado('pendiente')).toBe('ocupado');
  });

  it('completada se muestra como ocupado (ya pasó, pero el slot estuvo tomado)', () => {
    expect(mapCitaEstadoToTurnoCardEstado('completada')).toBe('ocupado');
  });

  it('cancelada libera el turno — se muestra como disponible', () => {
    expect(mapCitaEstadoToTurnoCardEstado('cancelada')).toBe('disponible');
  });

  it('no_show y reprogramada se mapean directo (mismo nombre)', () => {
    expect(mapCitaEstadoToTurnoCardEstado('no_show')).toBe('no_show');
    expect(mapCitaEstadoToTurnoCardEstado('reprogramada')).toBe('reprogramada');
  });

  it('un estado desconocido no rompe — cae a ocupado por defecto', () => {
    expect(mapCitaEstadoToTurnoCardEstado('algo_raro')).toBe('ocupado');
  });
});
