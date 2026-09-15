interface StockAlertResult {
  requiereAlerta: boolean;
}

export function checkStockAlert(stock: number, umbral: number | null): StockAlertResult {
  if (umbral === null) return { requiereAlerta: false };
  return { requiereAlerta: stock <= umbral };
}
