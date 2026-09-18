import { describe, it, expect } from 'vitest';
import { buildProductosMasVendidos } from './build-productos-mas-vendidos';

const PRODUCTOS = [
  { id: 'p1', nombre: 'Coca Cola', rubro: 'bebidas' },
  { id: 'p2', nombre: 'Papas fritas', rubro: 'snacks' },
];

describe('buildProductosMasVendidos', () => {
  it('cuenta cantidad vendida y factura total por producto', () => {
    const ranking = buildProductosMasVendidos({
      consumos: [
        { producto_id: 'p1', precio: 2000 },
        { producto_id: 'p1', precio: 2000 },
        { producto_id: 'p2', precio: 3500 },
      ],
      productos: PRODUCTOS,
    });

    const coca = ranking.find((r) => r.productoId === 'p1');
    expect(coca).toMatchObject({ nombre: 'Coca Cola', rubro: 'bebidas', cantidad: 2, total: 4000 });
  });

  it('ordena de mayor a menor facturación', () => {
    const ranking = buildProductosMasVendidos({
      consumos: [
        { producto_id: 'p1', precio: 2000 },
        { producto_id: 'p2', precio: 3500 },
        { producto_id: 'p2', precio: 3500 },
      ],
      productos: PRODUCTOS,
    });
    expect(ranking[0].productoId).toBe('p2'); // 7000 > 2000
  });

  it('ignora consumos sin producto_id (texto libre viejo)', () => {
    const ranking = buildProductosMasVendidos({
      consumos: [{ producto_id: null, precio: 1000 }],
      productos: PRODUCTOS,
    });
    expect(ranking).toHaveLength(0);
  });

  it('arma el desglose por rubro', () => {
    const resumen = buildProductosMasVendidos({
      consumos: [
        { producto_id: 'p1', precio: 2000 },
        { producto_id: 'p2', precio: 3500 },
      ],
      productos: PRODUCTOS,
    });
    const porRubro = resumen.reduce<Record<string, number>>((acc, r) => {
      acc[r.rubro ?? 'sin rubro'] = (acc[r.rubro ?? 'sin rubro'] ?? 0) + r.total;
      return acc;
    }, {});
    expect(porRubro).toEqual({ bebidas: 2000, snacks: 3500 });
  });
});
