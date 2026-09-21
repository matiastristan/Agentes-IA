import { describe, it, expect } from 'vitest';
import { fondoParaEstadoTurno } from './fondo-para-estado-turno';

describe('fondoParaEstadoTurno', () => {
  it('un turno con la cuenta cerrada (completada) se muestra en verde suave', () => {
    expect(fondoParaEstadoTurno('cita', 'completada')).toContain('success');
  });

  it('un turno marcado como no-show se muestra en rojo suave', () => {
    expect(fondoParaEstadoTurno('cita', 'no_show')).toContain('error');
  });

  it('un turno mensualizado tiene su propio fondo distintivo', () => {
    const fondo = fondoParaEstadoTurno('abono', undefined);
    expect(fondo).not.toContain('success');
    expect(fondo).not.toContain('error');
    expect(fondo.length).toBeGreaterThan(0);
  });

  it('un turno normal pendiente usa el fondo neutro de la paleta', () => {
    const fondo = fondoParaEstadoTurno('cita', 'pendiente');
    expect(fondo).toContain('primary-tint');
  });

  it('un turno sin estado definido no rompe', () => {
    expect(fondoParaEstadoTurno('cita', undefined)).toBeDefined();
  });

  it('un mensualizado nunca se pinta de verde aunque le pasen estado completada', () => {
    // Los abonos no se "cierran" como una cita puntual; su estado no aplica
    const fondo = fondoParaEstadoTurno('abono', 'completada');
    expect(fondo).not.toContain('success');
  });
});
