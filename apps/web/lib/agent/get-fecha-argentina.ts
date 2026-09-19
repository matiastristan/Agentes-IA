/**
 * Argentina no usa horario de verano desde 2009, así que UTC-3 es fijo
 * todo el año — no hace falta ninguna librería de timezones para esto.
 */
export function getFechaArgentina(now: Date = new Date()): string {
  const argentinaTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return argentinaTime.toISOString().slice(0, 10);
}
