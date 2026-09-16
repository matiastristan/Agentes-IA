const TEMPERATURAS_VALIDAS = ['frio', 'moderado', 'caliente'] as const;
type Temperatura = (typeof TEMPERATURAS_VALIDAS)[number];

const CATEGORIZAR_SYSTEM_PROMPT = `Analizá esta conversación entre un cliente y un negocio.
Respondé con UNA sola palabra, sin nada más: frio, moderado, o caliente.
"caliente" significa que el cliente muestra intención clara de compra/reserva
inminente. Respondé solo la palabra, sin puntuación ni explicación.`;

export async function categorizeTemperatura(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callOpenRouter: (params: any) => Promise<{ message: any }>
): Promise<Temperatura> {
  try {
    const { message } = await callOpenRouter({
      models: ['openrouter/free', 'z-ai/glm-5.2:free'],
      messages: [{ role: 'system', content: CATEGORIZAR_SYSTEM_PROMPT }, ...history],
      tools: [],
    });

    const respuesta = String(message.content ?? '').trim().toLowerCase();
    return (TEMPERATURAS_VALIDAS as readonly string[]).includes(respuesta)
      ? (respuesta as Temperatura)
      : 'frio';
  } catch {
    return 'frio';
  }
}
