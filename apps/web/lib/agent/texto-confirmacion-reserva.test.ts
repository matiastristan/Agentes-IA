import { describe, it, expect } from 'vitest';
import { textoConfirmacionReserva } from './texto-confirmacion-reserva';

describe('textoConfirmacionReserva', () => {
  it('una hora: nombre, cancha, día con fecha, hora y precio', () => {
    const t = textoConfirmacionReserva({
      cliente: 'Josue',
      cancha: 'Cancha Padel 2',
      fecha: '2026-09-21',
      horas: ['18:00'],
      precioTotal: 25000,
    });
    expect(t).toContain('Josue');
    expect(t).toContain('Cancha Padel 2');
    expect(t).toContain('lunes 21/09');
    expect(t).toContain('18:00');
    expect(t).toContain('$25.000');
  });

  it('varias horas: muestra el rango completo con la hora de fin real', () => {
    const t = textoConfirmacionReserva({
      cliente: 'Josue',
      cancha: 'Cancha Padel 2',
      fecha: '2026-09-21',
      horas: ['19:00', '20:00'],
      precioTotal: 50000,
    });
    expect(t).toContain('de 19:00 a 21:00');
    expect(t).toContain('$50.000');
  });

  it('una reserva que termina a medianoche muestra 00:00 como fin', () => {
    const t = textoConfirmacionReserva({
      cliente: 'Ana',
      cancha: 'Fútbol 5',
      fecha: '2026-09-21',
      horas: ['22:00', '23:00'],
      precioTotal: 80000,
    });
    expect(t).toContain('de 22:00 a 00:00');
  });

  it('nunca incluye IDs internos', () => {
    const t = textoConfirmacionReserva({
      cliente: 'Josue',
      cancha: 'Cancha Padel 2',
      fecha: '2026-09-21',
      horas: ['18:00'],
      precioTotal: 25000,
    });
    expect(t).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
  });
});
