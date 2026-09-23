import { describe, it, expect } from 'vitest';
import { planificarReserva } from './planificar-reserva';

// Lunes 21/09, horario 17 a 23. "Hoy" es domingo 20/09 a las 22:00 salvo que se indique.
const BASE = {
  fecha: '2026-09-21',
  hora: '19:00',
  cantidadHoras: 1,
  horarioDelDia: '17:00-23:00',
  citasRecurso: [],
  abonosRecurso: [],
  hoy: '2026-09-20',
  horaActual: '22:00',
};

describe('planificarReserva', () => {
  describe('reserva simple', () => {
    it('una hora libre dentro del horario se puede reservar', () => {
      expect(planificarReserva(BASE)).toEqual({ ok: true, horas: ['19:00'] });
    });

    it('por defecto reserva 1 hora si no se indica cantidad', () => {
      const { cantidadHoras, ...sinCantidad } = BASE;
      expect(planificarReserva(sinCantidad)).toEqual({ ok: true, horas: ['19:00'] });
    });
  });

  describe('varias horas seguidas (el caso "de 19 a 21")', () => {
    it('2 horas libres devuelve ambas horas', () => {
      expect(planificarReserva({ ...BASE, cantidadHoras: 2 })).toEqual({
        ok: true,
        horas: ['19:00', '20:00'],
      });
    });

    it('si la SEGUNDA hora está ocupada, no reserva ninguna (todo o nada)', () => {
      const r = planificarReserva({
        ...BASE,
        cantidadHoras: 2,
        citasRecurso: [{ hora: '20:00:00', estado: 'pendiente' }],
      });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.motivo).toBe('ocupado');
        expect(r.horasOcupadas).toEqual(['20:00']);
      }
    });

    it('si la segunda hora cae fuera del horario de atención, no reserva ninguna', () => {
      const r = planificarReserva({ ...BASE, hora: '22:00', cantidadHoras: 2 });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivo).toBe('fuera_de_horario');
    });

    it('rechaza cantidades de horas absurdas (0, negativas o más de 4)', () => {
      for (const cantidadHoras of [0, -1, 5, 1.5]) {
        const r = planificarReserva({ ...BASE, cantidadHoras });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.motivo).toBe('formato_invalido');
      }
    });
  });

  describe('ocupación', () => {
    it('una hora con un turno activo está ocupada', () => {
      const r = planificarReserva({
        ...BASE,
        citasRecurso: [{ hora: '19:00:00', estado: 'pendiente' }],
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivo).toBe('ocupado');
    });

    it('un turno cancelado NO ocupa la hora', () => {
      const r = planificarReserva({
        ...BASE,
        citasRecurso: [{ hora: '19:00:00', estado: 'cancelada' }],
      });
      expect(r.ok).toBe(true);
    });

    it('un turno completado o no-show sigue ocupando la hora', () => {
      for (const estado of ['completada', 'no_show', 'confirmada']) {
        const r = planificarReserva({ ...BASE, citasRecurso: [{ hora: '19:00:00', estado }] });
        expect(r.ok).toBe(false);
      }
    });

    it('un mensualizado bloquea todas las horas de su rango (el bug que tenía registrar_cita)', () => {
      const r = planificarReserva({
        ...BASE,
        hora: '19:00',
        abonosRecurso: [{ hora_inicio: '18:00:00', hora_fin: '20:00:00' }],
      });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.motivo).toBe('ocupado');
        expect(r.horasOcupadas).toEqual(['19:00']);
      }
    });

    it('la hora en que TERMINA un mensualizado queda libre', () => {
      const r = planificarReserva({
        ...BASE,
        hora: '20:00',
        abonosRecurso: [{ hora_inicio: '18:00:00', hora_fin: '20:00:00' }],
      });
      expect(r.ok).toBe(true);
    });
  });

  describe('horario de atención', () => {
    it('una hora antes de la apertura está fuera de horario', () => {
      const r = planificarReserva({ ...BASE, hora: '16:00' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivo).toBe('fuera_de_horario');
    });

    it('la hora de cierre ya está fuera de horario (el cierre es exclusivo)', () => {
      const r = planificarReserva({ ...BASE, hora: '23:00' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivo).toBe('fuera_de_horario');
    });

    it('un día sin horario configurado está cerrado', () => {
      const r = planificarReserva({ ...BASE, horarioDelDia: undefined });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivo).toBe('cerrado');
    });

    it('un horario que cierra a medianoche permite reservar las 23', () => {
      const r = planificarReserva({ ...BASE, hora: '23:00', horarioDelDia: '17:00-00:00' });
      expect(r).toEqual({ ok: true, horas: ['23:00'] });
    });
  });

  describe('fechas y horas pasadas', () => {
    it('una fecha anterior a hoy no se puede reservar', () => {
      const r = planificarReserva({ ...BASE, fecha: '2026-09-19' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivo).toBe('fecha_pasada');
    });

    it('hoy, una hora que ya pasó no se puede reservar', () => {
      const r = planificarReserva({
        ...BASE,
        fecha: '2026-09-20',
        hora: '19:00',
        horaActual: '19:30',
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivo).toBe('hora_pasada');
    });

    it('hoy, una hora futura sí se puede reservar', () => {
      const r = planificarReserva({
        ...BASE,
        fecha: '2026-09-20',
        hora: '20:00',
        horaActual: '19:30',
      });
      expect(r.ok).toBe(true);
    });
  });

  describe('formato de lo que manda el modelo', () => {
    it('acepta la hora con segundos', () => {
      expect(planificarReserva({ ...BASE, hora: '19:00:00' })).toEqual({ ok: true, horas: ['19:00'] });
    });

    it('acepta la hora sin minutos ("19")', () => {
      expect(planificarReserva({ ...BASE, hora: '19' })).toEqual({ ok: true, horas: ['19:00'] });
    });

    it('acepta la hora con un dígito ("9:00") y la normaliza', () => {
      const r = planificarReserva({ ...BASE, hora: '9:00', horarioDelDia: '08:00-12:00' });
      expect(r).toEqual({ ok: true, horas: ['09:00'] });
    });

    it('rechaza horas que no son en punto (los turnos son de hora completa)', () => {
      const r = planificarReserva({ ...BASE, hora: '19:30' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivo).toBe('formato_invalido');
    });

    it('rechaza horas imposibles o texto basura', () => {
      for (const hora of ['25:00', 'mañana', '', 'abc']) {
        const r = planificarReserva({ ...BASE, hora });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.motivo).toBe('formato_invalido');
      }
    });

    it('rechaza fechas con formato inválido', () => {
      for (const fecha of ['21/09/2026', '2026-13-01', 'mañana', '']) {
        const r = planificarReserva({ ...BASE, fecha });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.motivo).toBe('formato_invalido');
      }
    });
  });

  it('todo error trae un mensaje legible para que el modelo se lo explique al cliente', () => {
    const r = planificarReserva({ ...BASE, hora: '16:00' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.mensaje.length).toBeGreaterThan(10);
  });
});
