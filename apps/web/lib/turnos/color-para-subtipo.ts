// Cada FAMILIA de servicio tiene su color, no cada variante:
// todas las canchas de fútbol comparten un color, todas las de pádel otro.
// Así el dueño identifica de un vistazo qué tipo de cancha es cada columna.
const CLASES = [
  'border-l-4 border-l-temp-frio',
  'border-l-4 border-l-temp-moderado',
  'border-l-4 border-l-temp-caliente',
  'border-l-4 border-l-accent',
];

const CLASE_DEFAULT = 'border-l-4 border-l-border';

// Familias conocidas con color fijo asignado. Un mapa explícito en vez de un
// hash, porque el hash puede hacer colisionar dos familias distintas en el
// mismo color — justamente lo que hay que evitar acá.
const COLOR_POR_FAMILIA: Record<string, string> = {
  futbol: CLASES[0],
  padel: CLASES[1],
  tenis: CLASES[2],
  basquet: CLASES[3],
};

/**
 * Extrae la familia del subtipo: "futbol_5", "futbol_7" y "Futbol 11"
 * son todos la familia "futbol". "Padel_1" y "Padel_2" son "padel".
 */
function familiaDe(subtipo: string): string {
  const limpio = subtipo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // saca acentos: "fútbol" -> "futbol"
  return limpio.split(/[\s_\-0-9]+/).filter(Boolean)[0] ?? limpio;
}

function hashSimple(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function colorParaSubtipo(subtipo: string | null): string {
  if (!subtipo) return CLASE_DEFAULT;
  const familia = familiaDe(subtipo);
  // Familias conocidas: color fijo. Desconocidas: estable por hash.
  return COLOR_POR_FAMILIA[familia] ?? CLASES[hashSimple(familia) % CLASES.length];
}
