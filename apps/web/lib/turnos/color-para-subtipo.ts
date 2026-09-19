// Reutilizamos los 3 tokens de "temperatura" que ya existen en el sistema de diseño
// (frío/moderado/caliente) como una paleta chica y consistente para diferenciar
// tipos de servicio en las tarjetas — así nunca queda un color hardcodeado que
// rompa con la paleta de Apariencia elegida.
const CLASES = [
  'border-l-4 border-l-temp-frio',
  'border-l-4 border-l-temp-moderado',
  'border-l-4 border-l-temp-caliente',
];

const CLASE_DEFAULT = 'border-l-4 border-l-border';

function hashSimple(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function colorParaSubtipo(subtipo: string | null): string {
  if (!subtipo) return CLASE_DEFAULT;
  return CLASES[hashSimple(subtipo) % CLASES.length];
}
