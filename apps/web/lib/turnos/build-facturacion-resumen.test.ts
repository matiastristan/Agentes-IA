import { describe, it, expect } from 'vitest';
import { buildFacturacionResumen } from './build-facturacion-resumen';

describe('buildFacturacionResumen', () => {
  it('suma el precio del servicio + los consumos de cada cita completada', () => {
    const resumen = buildFacturacionResumen({
      citas: [
        { id: 'c1', recurso_id: 'r1', estado: 'completada', precioServicio: 42000 },
        { id: 'c2', recurso_id: 'r1', estado: 'completada', precioServicio: 55000 },
      ],
      consumos: [
        { cita_id: 'c1', abono_id: null, precio: 2000 },
        { cita_id: 'c1', abono_id: null, precio: 3500 },
      ],
    });
    // c1: 42000 + 2000 + 3500 = 47500, c2: 55000 → total 102500
    expect(resumen.total).toBe(102500);
  });

  it('no cuenta citas que no están completadas', () => {
    const resumen = buildFacturacionResumen({
      citas: [
        { id: 'c1', recurso_id: 'r1', estado: 'pendiente', precioServicio: 42000 },
        { id: 'c2', recurso_id: 'r1', estado: 'no_show', precioServicio: 55000 },
      ],
      consumos: [],
    });
    expect(resumen.total).toBe(0);
  });

  it('arma el desglose de facturación por cancha (recurso_id)', () => {
    const resumen = buildFacturacionResumen({
      citas: [
        { id: 'c1', recurso_id: 'r1', estado: 'completada', precioServicio: 42000 },
        { id: 'c2', recurso_id: 'r2', estado: 'completada', precioServicio: 55000 },
      ],
      consumos: [],
    });
    expect(resumen.porCancha).toEqual({ r1: 42000, r2: 55000 });
  });

  it('sin citas, el total y el desglose están vacíos', () => {
    const resumen = buildFacturacionResumen({ citas: [], consumos: [] });
    expect(resumen.total).toBe(0);
    expect(resumen.porCancha).toEqual({});
  });

  it('cuenta la cantidad de turnos completados (para el ticket promedio)', () => {
    const resumen = buildFacturacionResumen({
      citas: [
        { id: 'c1', recurso_id: 'r1', estado: 'completada', precioServicio: 42000 },
        { id: 'c2', recurso_id: 'r1', estado: 'completada', precioServicio: 55000 },
        { id: 'c3', recurso_id: 'r1', estado: 'pendiente', precioServicio: 40000 },
      ],
      consumos: [],
    });
    expect(resumen.cantidadTurnos).toBe(2);
  });
});
