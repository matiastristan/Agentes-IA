import { describe, it, expect } from 'vitest';
import { mapExcelRowToProducto } from './map-excel-row';

describe('mapExcelRowToProducto', () => {
  it('reconoce nombre, precio y stock como columnas propias', () => {
    const row = { nombre: 'Alimento perro', precio: 5000, stock: 20 };
    const result = mapExcelRowToProducto(row);
    expect(result.nombre).toBe('Alimento perro');
    expect(result.precio).toBe(5000);
    expect(result.stock).toBe(20);
  });

  it('cualquier otra columna va a atributos', () => {
    const row = { nombre: 'Zapatilla', precio: 45000, stock: 5, talle: '42', color: 'negro' };
    const result = mapExcelRowToProducto(row);
    expect(result.atributos).toEqual({ talle: '42', color: 'negro' });
  });

  it('es insensible a mayúsculas en los encabezados reconocidos', () => {
    const row = { Nombre: 'Producto', Precio: 100, Stock: 3 };
    const result = mapExcelRowToProducto(row);
    expect(result.nombre).toBe('Producto');
    expect(result.precio).toBe(100);
    expect(result.stock).toBe(3);
  });

  it('funciona sin precio ni stock (quedan undefined/0), sin romper', () => {
    const row = { nombre: 'Solo nombre', marca: 'Genérica' };
    const result = mapExcelRowToProducto(row);
    expect(result.nombre).toBe('Solo nombre');
    expect(result.precio).toBeUndefined();
    expect(result.stock).toBe(0);
    expect(result.atributos).toEqual({ marca: 'Genérica' });
  });

  it('reconoce rubro como columna propia (no va a atributos)', () => {
    const row = { nombre: 'Coca Cola', precio: 2000, stock: 50, rubro: 'bebidas' };
    const result = mapExcelRowToProducto(row);
    expect(result.rubro).toBe('bebidas');
    expect(result.atributos).toEqual({});
  });

  it('sin columna rubro, queda undefined (no rompe)', () => {
    const row = { nombre: 'Producto', precio: 100, stock: 3 };
    const result = mapExcelRowToProducto(row);
    expect(result.rubro).toBeUndefined();
  });
});
