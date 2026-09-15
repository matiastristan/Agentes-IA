import { describe, it, expect } from 'vitest';
import { findNextWaitlistCandidate } from './waitlist-notifier';

describe('findNextWaitlistCandidate', () => {
  it('devuelve el primero en orden de llegada que coincide en servicio y franja', () => {
    const entries = [
      {
        id: '1',
        servicio_id: 'serv-1',
        recurso_id: null,
        estado: 'esperando',
        created_at: '2026-09-01T10:00:00Z',
        franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' },
      },
      {
        id: '2',
        servicio_id: 'serv-1',
        recurso_id: null,
        estado: 'esperando',
        created_at: '2026-09-02T10:00:00Z',
        franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' },
      },
    ];
    const canceled = { servicio_id: 'serv-1', recurso_id: 'recurso-1', fecha: '2026-10-05', hora: '15:00' };
    const result = findNextWaitlistCandidate(entries, canceled);
    expect(result?.id).toBe('1');
  });

  it('ignora entradas que no están en estado esperando', () => {
    const entries = [
      {
        id: '1',
        servicio_id: 'serv-1',
        recurso_id: null,
        estado: 'notificado',
        created_at: '2026-09-01T10:00:00Z',
        franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' },
      },
    ];
    const canceled = { servicio_id: 'serv-1', recurso_id: 'recurso-1', fecha: '2026-10-05', hora: '15:00' };
    expect(findNextWaitlistCandidate(entries, canceled)).toBeNull();
  });

  it('ignora entradas de otro servicio', () => {
    const entries = [
      {
        id: '1',
        servicio_id: 'serv-OTRO',
        recurso_id: null,
        estado: 'esperando',
        created_at: '2026-09-01T10:00:00Z',
        franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' },
      },
    ];
    const canceled = { servicio_id: 'serv-1', recurso_id: 'recurso-1', fecha: '2026-10-05', hora: '15:00' };
    expect(findNextWaitlistCandidate(entries, canceled)).toBeNull();
  });

  it('respeta un recurso_id específico pedido (ej. su barbero de confianza)', () => {
    const entries = [
      {
        id: '1',
        servicio_id: 'serv-1',
        recurso_id: 'recurso-DISTINTO',
        estado: 'esperando',
        created_at: '2026-09-01T10:00:00Z',
        franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' },
      },
      {
        id: '2',
        servicio_id: 'serv-1',
        recurso_id: 'recurso-1',
        estado: 'esperando',
        created_at: '2026-09-02T10:00:00Z',
        franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '14:00', hora_hasta: '18:00' },
      },
    ];
    const canceled = { servicio_id: 'serv-1', recurso_id: 'recurso-1', fecha: '2026-10-05', hora: '15:00' };
    expect(findNextWaitlistCandidate(entries, canceled)?.id).toBe('2');
  });

  it('la hora cancelada debe caer dentro de la franja deseada', () => {
    const entries = [
      {
        id: '1',
        servicio_id: 'serv-1',
        recurso_id: null,
        estado: 'esperando',
        created_at: '2026-09-01T10:00:00Z',
        franja_horaria_deseada: { fecha: '2026-10-05', hora_desde: '09:00', hora_hasta: '12:00' },
      },
    ];
    const canceled = { servicio_id: 'serv-1', recurso_id: 'recurso-1', fecha: '2026-10-05', hora: '15:00' };
    expect(findNextWaitlistCandidate(entries, canceled)).toBeNull();
  });
});
