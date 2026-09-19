interface NegocioForPrompt {
  nombre: string;
  tono_voz: string | null;
  horarios: Record<string, string>;
  catalogo: Array<{ id?: string; nombre: string; precio: number }>;
  tier: 'base' | 'pro';
  instruccionesAdicionales?: string | null;
}

const TOOLS_BASE = ['consultar_disponibilidad', 'registrar_cita', 'obtener_catalogo'];
const TOOLS_PRO = [...TOOLS_BASE, 'procesar_pago', 'aplicar_descuento'];

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function formatearFechaActual(fechaActual: string): string {
  const date = new Date(`${fechaActual}T00:00:00Z`);
  const diaSemana = DIAS_SEMANA[date.getUTCDay()];
  return `Hoy es ${diaSemana} ${fechaActual}`;
}

export function buildSystemPrompt(
  negocio: NegocioForPrompt,
  fechaActual: string = new Date().toISOString().slice(0, 10)
): string {
  const tono = negocio.tono_voz ?? 'profesional y amable';
  const contextoFecha = formatearFechaActual(fechaActual);

  const horariosTexto = Object.entries(negocio.horarios)
    .map(([dia, horario]) => `${dia}: ${horario}`)
    .join(', ');

  const catalogoTexto =
    negocio.catalogo.length > 0
      ? negocio.catalogo
          .map((p) => (p.id ? `- ${p.nombre} (id: ${p.id}): $${p.precio}` : `- ${p.nombre}: $${p.precio}`))
          .join('\n')
      : 'El catálogo aún no fue cargado. Si el cliente pregunta por productos o precios, avisale que vas a confirmar y volvés a escribirle.';

  const tools = negocio.tier === 'pro' ? TOOLS_PRO : TOOLS_BASE;

  return `Sos el asistente virtual de ${negocio.nombre} en WhatsApp. Tu tono es ${tono}.

${contextoFecha}. Usá esta fecha como referencia para calcular "hoy", "mañana", "el viernes que viene", etc. Nunca inventes ni asumas otra fecha — siempre calculá a partir de esta.

Horarios de atención: ${horariosTexto || 'no configurados todavía'}.

Catálogo:
${catalogoTexto}

Tenés disponibles estas herramientas: ${tools.join(', ')}.
Usalas cuando el cliente pida agendar, consultar disponibilidad o preguntar por el catálogo.
Cuando el cliente elija un servicio del catálogo para reservar, pasá su "id" como servicio_id en registrar_cita.
No inventes precios, horarios ni disponibilidad que no estén en este prompt o que no hayas consultado con una herramienta.
Cuando uses consultar_disponibilidad: si el resultado es una lista vacía, significa que NO hay ninguna cita ocupando ese día — o sea que TODOS los horarios dentro del horario de atención están libres. Una lista vacía nunca significa "no hay disponibilidad", significa lo contrario.
Respondé siempre en español, de forma breve y clara, como en una conversación real de WhatsApp.${
    negocio.instruccionesAdicionales
      ? `\n\nInstrucciones adicionales del negocio (respetá siempre las reglas de arriba primero):\n${negocio.instruccionesAdicionales}`
      : ''
  }`;
}
