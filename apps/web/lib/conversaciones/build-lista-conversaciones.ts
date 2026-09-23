export interface ConversacionRaw {
  id: string;
  phone_from: string;
  customer_name: string | null;
  temperatura: string | null;
  bot_desactivado: boolean | null;
  created_at: string;
}

export interface MensajeRaw {
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ItemConversacion {
  id: string;
  telefono: string;
  nombre: string | null;
  temperatura: string | null;
  botActivo: boolean;
  bloqueado: boolean;
  ultimoMensaje: { texto: string; deCliente: boolean; fecha: string } | null;
}

const LARGO_PREVIEW = 80;

function recortar(texto: string): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > LARGO_PREVIEW ? `${limpio.slice(0, LARGO_PREVIEW)}…` : limpio;
}

export function buildListaConversaciones({
  conversaciones,
  mensajes,
  nombresPorTelefono,
  telefonosBloqueados,
}: {
  conversaciones: ConversacionRaw[];
  mensajes: MensajeRaw[];
  /** Nombre sacado de los turnos del cliente, por si la conversación no lo tiene. */
  nombresPorTelefono: Record<string, string>;
  telefonosBloqueados: string[];
}): ItemConversacion[] {
  const ultimoPorConversacion = new Map<string, MensajeRaw>();
  for (const m of mensajes) {
    const previo = ultimoPorConversacion.get(m.conversation_id);
    if (!previo || m.created_at > previo.created_at) ultimoPorConversacion.set(m.conversation_id, m);
  }
  const bloqueados = new Set(telefonosBloqueados);

  const items = conversaciones.map((c): ItemConversacion => {
    const ultimo = ultimoPorConversacion.get(c.id);
    return {
      id: c.id,
      telefono: c.phone_from,
      nombre: c.customer_name || nombresPorTelefono[c.phone_from] || null,
      temperatura: c.temperatura,
      botActivo: !c.bot_desactivado,
      bloqueado: bloqueados.has(c.phone_from),
      ultimoMensaje: ultimo
        ? { texto: recortar(ultimo.content), deCliente: ultimo.role === 'user', fecha: ultimo.created_at }
        : null,
    };
  });

  // Más reciente primero; las que no tienen mensajes, al final.
  return items.sort((a, b) => {
    const fa = a.ultimoMensaje?.fecha ?? '';
    const fb = b.ultimoMensaje?.fecha ?? '';
    return fb.localeCompare(fa);
  });
}

function normalizarTexto(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const soloDigitos = (t: string) => t.replace(/\D/g, '');

/**
 * Filtro del buscador: por nombre (sin acentos ni mayúsculas) o por teléfono
 * (ignorando +, espacios y guiones, y aceptando una parte del número).
 */
export function filtrarConversaciones(lista: ItemConversacion[], busqueda: string): ItemConversacion[] {
  const q = busqueda.trim();
  if (!q) return lista;

  const texto = normalizarTexto(q);
  const digitos = soloDigitos(q);

  return lista.filter((c) => {
    if (c.nombre && normalizarTexto(c.nombre).includes(texto)) return true;
    // Un número pegado con el formato internacional ("+54 9 387...") igual matchea
    if (digitos.length >= 3 && c.telefono.includes(digitos)) return true;
    return false;
  });
}
