import { describe, it, expect } from 'vitest';
import { checkStockAlert } from './check-stock-alert';

describe('checkStockAlert', () => {
  it('stock por encima del umbral no alerta', () => {
    expect(checkStockAlert(10, 5).requiereAlerta).toBe(false);
  });

  it('stock igual al umbral SÍ alerta', () => {
    expect(checkStockAlert(5, 5).requiereAlerta).toBe(true);
  });

  it('stock por debajo del umbral alerta', () => {
    expect(checkStockAlert(2, 5).requiereAlerta).toBe(true);
  });

  it('sin umbral configurado (null) nunca alerta', () => {
    expect(checkStockAlert(0, null).requiereAlerta).toBe(false);
  });
});
