import { describe, it, expect } from 'vitest';
import { buildKpisPorCancha } from './build-kpis-por-cancha';

const SLOTS = [
  {
    recurso: { id: 'r1', nombre: 'Cancha 1', subtipo: 'futbol_5' },
    horas: [
      { hora: '17:00', ocupado: true, turno: { tipo: 'cita' as const, id: 'c1' } },
      { hora: '18:00', ocupado: false, turno: null },
      { hora: '19:00', ocupado: true, turno: { tipo: 'cita' as const, id: 'c2' } },
    ],
  },
  {
    recurso: { id: 'r2', nombre: 'Cancha 2', subtipo: 'futbol_5' },
    horas: [
      { hora: '17:00', ocupado: false, turno: null },
      { hora: '18:00', ocupado: false, turno: null },
    ],
  },
];

describe('buildKpisPorCancha', () => {
  it('cuenta turnos totales (ocupados) y disponibles (libres) por cancha', () => {
    const kpis = buildKpisPorCancha(SLOTS as never, []);
    expect(kpis[0]).toMatchObject({ recursoId: 'r1', turnosTotal: 2, turnosDisponibles: 1 });
    expect(kpis[1]).toMatchObject({ recursoId: 'r2', turnosTotal: 0, turnosDisponibles: 2 });
  });

  it('cuenta los no-show de esa cancha ese día', () => {
    const kpis = buildKpisPorCancha(SLOTS as never, [
      { recurso_id: 'r1', estado: 'no_show' },
      { recurso_id: 'r1', estado: 'completada' },
      { recurso_id: 'r2', estado: 'no_show' },
    ]);
    expect(kpis[0].noShow).toBe(1);
    expect(kpis[1].noShow).toBe(1);
  });

  it('sin citas, no-show es 0', () => {
    const kpis = buildKpisPorCancha(SLOTS as never, []);
    expect(kpis.every((k) => k.noShow === 0)).toBe(true);
  });
});
