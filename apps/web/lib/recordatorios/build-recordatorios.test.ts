import { describe, it, expect } from 'vitest';
import { buildRecordatorios } from './build-recordatorios';

const cita = (id: string, hora: string, extra: Record<string, unknown> = {}) => ({
  id, hora: `${hora}:00`, customer_id: '5493871111111', customer_name: 'Josue',
  recurso_id: 'p2', recurso_nombre: 'Cancha Padel 2', estado: 'pendiente', ...extra,
});

const BASE = { fecha: '2026-09-22', citas: [], abonos: [], citasYaEnviadas: [], abonosYaEnviados: [] };

describe('buildRecordatorios', () => {
  it('un turno de una hora genera un recordatorio', () => {
    const r = buildRecordatorios({ ...BASE, citas: [cita('a', '19:00')] });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      citaId: 'a', telefono: '5493871111111', nombre: 'Josue',
      cancha: 'Cancha Padel 2', horaInicio: '19:00', fecha: '2026-09-22',
    });
  });

  it('un turno de dos horas genera UN solo recordatorio, con el rango completo', () => {
    const r = buildRecordatorios({ ...BASE, citas: [cita('a', '19:00'), cita('b', '20:00')] });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ citaId: 'a', horaInicio: '19:00', horaFin: '21:00' });
  });

  it('dos clientes distintos generan dos recordatorios', () => {
    const r = buildRecordatorios({
      ...BASE,
      citas: [cita('a', '19:00'), cita('b', '20:00', { customer_id: '549387222', customer_name: 'Ana' })],
    });
    expect(r).toHaveLength(2);
  });

  it('no manda recordatorio de un turno cancelado', () => {
    const r = buildRecordatorios({ ...BASE, citas: [cita('a', '19:00', { estado: 'cancelada' })] });
    expect(r).toHaveLength(0);
  });

  it('no repite un recordatorio ya enviado', () => {
    const r = buildRecordatorios({ ...BASE, citas: [cita('a', '19:00')], citasYaEnviadas: ['a'] });
    expect(r).toHaveLength(0);
  });

  it('si alguna hora del turno ya tuvo recordatorio, no lo repite', () => {
    const r = buildRecordatorios({
      ...BASE, citas: [cita('a', '19:00'), cita('b', '20:00')], citasYaEnviadas: ['b'],
    });
    expect(r).toHaveLength(0);
  });

  it('sin teléfono no se puede avisar: se descarta', () => {
    const r = buildRecordatorios({ ...BASE, citas: [cita('a', '19:00', { customer_id: 'sin-telefono' })] });
    expect(r).toHaveLength(0);
  });

  it('incluye a los clientes mensualizados de ese día', () => {
    const r = buildRecordatorios({
      ...BASE,
      abonos: [{ id: 'ab1', cliente_nombre: 'Marcos', cliente_telefono: '5493873333333',
                 hora_inicio: '18:00:00', hora_fin: '20:00:00', recurso_nombre: 'Cancha Padel 1' }],
    });
    expect(r[0]).toMatchObject({ abonoId: 'ab1', nombre: 'Marcos', horaInicio: '18:00', horaFin: '20:00' });
  });

  it('un mensualizado sin teléfono se descarta', () => {
    const r = buildRecordatorios({
      ...BASE,
      abonos: [{ id: 'ab1', cliente_nombre: 'Marcos', cliente_telefono: null,
                 hora_inicio: '18:00:00', hora_fin: '20:00:00', recurso_nombre: 'Cancha 1' }],
    });
    expect(r).toHaveLength(0);
  });

  it('un mensualizado ya avisado hoy no se repite', () => {
    const r = buildRecordatorios({
      ...BASE, abonosYaEnviados: ['ab1'],
      abonos: [{ id: 'ab1', cliente_nombre: 'M', cliente_telefono: '549387', hora_inicio: '18:00:00', hora_fin: '20:00:00', recurso_nombre: 'C' }],
    });
    expect(r).toHaveLength(0);
  });

  it('ordena los recordatorios por hora de inicio', () => {
    const r = buildRecordatorios({
      ...BASE,
      citas: [cita('a', '21:00'), cita('b', '17:00', { customer_id: '549387999', customer_name: 'Ana' })],
    });
    expect(r.map((x) => x.horaInicio)).toEqual(['17:00', '21:00']);
  });
});
