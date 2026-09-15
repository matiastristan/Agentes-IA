import { describe, it, expect } from 'vitest';
import { extractDynamicColumns } from './extract-dynamic-columns';

describe('extractDynamicColumns', () => {
  it('devuelve las claves únicas de atributos de todos los productos', () => {
    const productos = [
      { atributos: { talle: '42', color: 'negro' } },
      { atributos: { talle: '40', color: 'blanco' } },
    ];
    expect(extractDynamicColumns(productos)).toEqual(['talle', 'color']);
  });

  it('une columnas distintas de productos distintos (rubros mixtos)', () => {
    const productos = [{ atributos: { talle: '42' } }, { atributos: { peso: '5kg' } }];
    expect(extractDynamicColumns(productos)).toEqual(['talle', 'peso']);
  });

  it('devuelve array vacío si ningún producto tiene atributos', () => {
    expect(extractDynamicColumns([{ atributos: {} }, { atributos: {} }])).toEqual([]);
  });

  it('no duplica columnas repetidas entre productos', () => {
    const productos = [{ atributos: { color: 'negro' } }, { atributos: { color: 'blanco' } }];
    expect(extractDynamicColumns(productos)).toEqual(['color']);
  });
});
