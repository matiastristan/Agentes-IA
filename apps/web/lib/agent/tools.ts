export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}

const consultar_disponibilidad: ToolDefinition = {
  type: 'function',
  function: {
    name: 'consultar_disponibilidad',
    description: 'Consulta los horarios disponibles para agendar una cita en una fecha dada.',
    parameters: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
      },
      required: ['fecha'],
    },
  },
};

const registrar_cita: ToolDefinition = {
  type: 'function',
  function: {
    name: 'registrar_cita',
    description: 'Registra una cita nueva para un cliente en una fecha y hora específicas.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Nombre del cliente' },
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        hora: { type: 'string', description: 'Hora en formato HH:MM' },
      },
      required: ['customer_name', 'fecha', 'hora'],
    },
  },
};

const obtener_catalogo: ToolDefinition = {
  type: 'function',
  function: {
    name: 'obtener_catalogo',
    description: 'Devuelve el catálogo completo de productos o servicios del negocio, con precios y stock.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
};

const procesar_pago: ToolDefinition = {
  type: 'function',
  function: {
    name: 'procesar_pago',
    description: 'Procesa el cobro de una compra o seña. Solo disponible en tier Pro.',
    parameters: {
      type: 'object',
      properties: {
        monto: { type: 'number', description: 'Monto a cobrar en pesos argentinos' },
      },
      required: ['monto'],
    },
  },
};

const aplicar_descuento: ToolDefinition = {
  type: 'function',
  function: {
    name: 'aplicar_descuento',
    description: 'Aplica un descuento porcentual a una compra. Solo disponible en tier Pro.',
    parameters: {
      type: 'object',
      properties: {
        porcentaje: { type: 'number', description: 'Porcentaje de descuento (0-100)' },
      },
      required: ['porcentaje'],
    },
  },
};

const BASE_TOOLS = [consultar_disponibilidad, registrar_cita, obtener_catalogo];
const PRO_TOOLS = [...BASE_TOOLS, procesar_pago, aplicar_descuento];

export function getToolsForTier(tier: 'base' | 'pro'): ToolDefinition[] {
  return tier === 'pro' ? PRO_TOOLS : BASE_TOOLS;
}
