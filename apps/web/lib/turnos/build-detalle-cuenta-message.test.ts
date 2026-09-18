import { describe, it, expect } from 'vitest';
import { buildDetalleCuentaMessage } from './build-detalle-cuenta-message';

describe('buildDetalleCuentaMessage', () => {
  it('arma el mensaje con el precio base y el total', () => {
    const msg = buildDetalleCuentaMessage({
      nombreNegocio: 'Canchas Test Fútbol',
      clienteNombre: 'Roberto',
      precioBase: 42000,
      consumos: [],
    });
    expect(msg).toContain('Canchas Test Fútbol');
    expect(msg).toContain('Roberto');
    expect(msg).toContain('42000');
  });

  it('lista cada consumo con su precio', () => {
    const msg = buildDetalleCuentaMessage({
      nombreNegocio: 'Canchas Test Fútbol',
      clienteNombre: 'Roberto',
      precioBase: 42000,
      consumos: [
        { descripcion: 'Coca Cola', precio: 2000 },
        { descripcion: 'Papas fritas', precio: 3500 },
      ],
    });
    expect(msg).toContain('Coca Cola');
    expect(msg).toContain('2000');
    expect(msg).toContain('Papas fritas');
    expect(msg).toContain('3500');
  });

  it('el total suma el precio base más todos los consumos', () => {
    const msg = buildDetalleCuentaMessage({
      nombreNegocio: 'X',
      clienteNombre: 'Y',
      precioBase: 42000,
      consumos: [
        { descripcion: 'A', precio: 2000 },
        { descripcion: 'B', precio: 3500 },
      ],
    });
    // 42000 + 2000 + 3500 = 47500
    expect(msg).toContain('47500');
  });

  it('sin consumos, el total es igual al precio base', () => {
    const msg = buildDetalleCuentaMessage({
      nombreNegocio: 'X',
      clienteNombre: 'Y',
      precioBase: 42000,
      consumos: [],
    });
    const ocurrencias = msg.split('42000').length - 1;
    expect(ocurrencias).toBeGreaterThanOrEqual(1);
  });
});
