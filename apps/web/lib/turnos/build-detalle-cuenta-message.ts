interface Consumo {
  descripcion: string;
  precio: number;
}

interface BuildDetalleCuentaMessageParams {
  nombreNegocio: string;
  clienteNombre: string;
  precioBase: number;
  consumos: Consumo[];
}

export function buildDetalleCuentaMessage({
  nombreNegocio,
  clienteNombre,
  precioBase,
  consumos,
}: BuildDetalleCuentaMessageParams): string {
  const totalConsumos = consumos.reduce((acc, c) => acc + c.precio, 0);
  const total = precioBase + totalConsumos;

  const lineasConsumos = consumos.map((c) => `- ${c.descripcion}: $${c.precio}`).join('\n');

  return (
    `¡Hola ${clienteNombre}! Este es el detalle de tu turno en ${nombreNegocio}:\n\n` +
    `- Turno: $${precioBase}\n` +
    (consumos.length > 0 ? `${lineasConsumos}\n` : '') +
    `\nTotal: $${total}\n\n¡Gracias por venir!`
  );
}
