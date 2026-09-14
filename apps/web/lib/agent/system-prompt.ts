interface NegocioForPrompt {
  nombre: string;
  tono_voz: string | null;
  horarios: Record<string, string>;
  catalogo: Array<{ nombre: string; precio: number }>;
  tier: 'base' | 'pro';
}

const TOOLS_BASE = ['consultar_disponibilidad', 'registrar_cita', 'obtener_catalogo'];
const TOOLS_PRO = [...TOOLS_BASE, 'procesar_pago', 'aplicar_descuento'];

export function buildSystemPrompt(negocio: NegocioForPrompt): string {
  const tono = negocio.tono_voz ?? 'profesional y amable';

  const horariosTexto = Object.entries(negocio.horarios)
    .map(([dia, horario]) => `${dia}: ${horario}`)
    .join(', ');

  const catalogoTexto =
    negocio.catalogo.length > 0
      ? negocio.catalogo.map((p) => `- ${p.nombre}: $${p.precio}`).join('\n')
      : 'El catálogo aún no fue cargado. Si el cliente pregunta por productos o precios, avisale que vas a confirmar y volvés a escribirle.';

  const tools = negocio.tier === 'pro' ? TOOLS_PRO : TOOLS_BASE;

  return `Sos el asistente virtual de ${negocio.nombre} en WhatsApp. Tu tono es ${tono}.

Horarios de atención: ${horariosTexto || 'no configurados todavía'}.

Catálogo:
${catalogoTexto}

Tenés disponibles estas herramientas: ${tools.join(', ')}.
Usalas cuando el cliente pida agendar, consultar disponibilidad o preguntar por el catálogo.
No inventes precios, horarios ni disponibilidad que no estén en este prompt o que no hayas consultado con una herramienta.
Respondé siempre en español, de forma breve y clara, como en una conversación real de WhatsApp.`;
}
