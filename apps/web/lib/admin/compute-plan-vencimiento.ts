export function computePlanFechaVencimiento(
  fechaAlta: string,
  ciclo: 'mensual' | 'anual'
): string {
  const dias = ciclo === 'anual' ? 365 : 30;
  const [year, month, day] = fechaAlta.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + dias);
  return date.toISOString().slice(0, 10);
}
