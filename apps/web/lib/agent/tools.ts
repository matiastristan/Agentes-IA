export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      properties: Record<string, any>;
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
        servicio_id: {
          type: 'string',
          description: 'El "id" del servicio elegido, tal como aparece en el catálogo. IMPORTANTE: pasalo siempre que el cliente haya elegido un servicio — sin esto, la reserva no queda asignada a ninguna cancha física y no va a aparecer bien en el calendario del negocio.',
        },
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

const reprogramar_cita: ToolDefinition = {
  type: 'function',
  function: {
    name: 'reprogramar_cita',
    description: 'Reprograma una cita existente a una nueva fecha y hora, validando las reglas de anticipación del negocio.',
    parameters: {
      type: 'object',
      properties: {
        cita_id: { type: 'string', description: 'ID de la cita a reprogramar' },
        nueva_fecha: { type: 'string', description: 'Nueva fecha en formato YYYY-MM-DD' },
        nueva_hora: { type: 'string', description: 'Nueva hora en formato HH:MM' },
      },
      required: ['cita_id', 'nueva_fecha', 'nueva_hora'],
    },
  },
};

const anotar_lista_espera: ToolDefinition = {
  type: 'function',
  function: {
    name: 'anotar_lista_espera',
    description: 'Anota al cliente en la lista de espera cuando no hay disponibilidad en la franja horaria pedida.',
    parameters: {
      type: 'object',
      properties: {
        servicio_id: { type: 'string', description: 'ID del servicio deseado' },
        fecha: { type: 'string', description: 'Fecha deseada YYYY-MM-DD' },
        hora_desde: { type: 'string', description: 'Inicio de la franja horaria aceptable HH:MM' },
        hora_hasta: { type: 'string', description: 'Fin de la franja horaria aceptable HH:MM' },
      },
      required: ['servicio_id', 'fecha', 'hora_desde', 'hora_hasta'],
    },
  },
};

const registrar_venta: ToolDefinition = {
  type: 'function',
  function: {
    name: 'registrar_venta',
    description:
      'Registra una venta con uno o más productos o combos, y descuenta el stock correspondiente.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Nombre del cliente' },
        items: {
          type: 'array',
          description: 'Lista de productos o combos comprados',
          items: {
            type: 'object',
            properties: {
              producto_id: { type: 'string', description: 'ID del producto (si no es un combo)' },
              combo_id: { type: 'string', description: 'ID del combo (si aplica)' },
              cantidad: { type: 'number', description: 'Cantidad comprada' },
            },
          },
        },
      },
      required: ['customer_name', 'items'],
    },
  },
};

const BASE_TOOLS = [
  consultar_disponibilidad,
  registrar_cita,
  obtener_catalogo,
  reprogramar_cita,
  anotar_lista_espera,
  registrar_venta,
];
const PRO_TOOLS = [...BASE_TOOLS, procesar_pago, aplicar_descuento];

export function getToolsForTier(tier: 'base' | 'pro'): ToolDefinition[] {
  return tier === 'pro' ? PRO_TOOLS : BASE_TOOLS;
}
