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
    description: 'Consulta qué horas quedan libres EN CADA CANCHA para una fecha. Devuelve una lista de canchas, cada una con sus horas libres.',
    parameters: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        servicio: {
          type: 'string',
          description: 'Opcional. Filtra por tipo de cancha cuando el cliente pide algo puntual, por ejemplo "padel" o "futbol". Si el cliente no especifica, omitilo para ver todas.',
        },
      },
      required: ['fecha'],
    },
  },
};

const registrar_cita: ToolDefinition = {
  type: 'function',
  function: {
    name: 'registrar_cita',
    description:
      'Reserva un turno en una cancha. Verifica sola la disponibilidad (turnos, mensualizados y horario de atención) antes de guardar. ' +
      'Para varias horas seguidas usá cantidad_horas en UNA sola llamada: se reservan todas juntas o ninguna. ' +
      'Si devuelve error, NO se reservó nada. El teléfono del cliente se asocia solo: no lo pidas ni lo pases.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Nombre del cliente' },
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        hora: { type: 'string', description: 'Hora de INICIO en formato HH:MM, en punto (ej. 19:00)' },
        servicio_id: {
          type: 'string',
          description: 'El "id" de la cancha elegida, tal como figura en el catálogo.',
        },
        cantidad_horas: {
          type: 'integer',
          description:
            'Cantidad de horas consecutivas desde la hora de inicio (1 a 4). Por defecto 1. "De 19 a 21" = hora 19:00 con cantidad_horas 2.',
        },
      },
      required: ['customer_name', 'fecha', 'hora', 'servicio_id'],
    },
  },
};

const cancelar_cita: ToolDefinition = {
  type: 'function',
  function: {
    name: 'cancelar_cita',
    description:
      'Cancela un turno del cliente que está escribiendo (se identifica por su propio número: nunca puede cancelar el de otra persona). ' +
      'Cancela el turno COMPLETO, aunque sea de varias horas.',
    parameters: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha del turno a cancelar, en formato YYYY-MM-DD' },
        hora: {
          type: 'string',
          description: 'Hora del turno (HH:MM). Solo hace falta si el cliente tiene varios turnos ese día.',
        },
      },
      required: ['fecha'],
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
    description:
      'Mueve un turno del cliente a otra fecha u hora. Identifica el turno por la fecha actual (y la hora, si el cliente tiene más de uno ese día). ' +
      'Mueve el turno COMPLETO: si era de dos horas, sigue siendo de dos horas. ' +
      'Si el horario nuevo no se puede tomar, el turno original NO se toca: nunca le digas al cliente que perdió su turno.',
    parameters: {
      type: 'object',
      properties: {
        fecha_actual: { type: 'string', description: 'Fecha del turno que ya tiene, en formato YYYY-MM-DD' },
        hora_actual: {
          type: 'string',
          description: 'Hora del turno actual (HH:MM). Solo hace falta si el cliente tiene varios turnos ese día.',
        },
        nueva_fecha: { type: 'string', description: 'Nueva fecha en formato YYYY-MM-DD' },
        nueva_hora: { type: 'string', description: 'Nueva hora de inicio en formato HH:MM, en punto' },
        nuevo_servicio_id: {
          type: 'string',
          description: 'Solo si además quiere cambiar de cancha: el id de la cancha nueva, como figura en el catálogo.',
        },
      },
      required: ['fecha_actual', 'nueva_fecha', 'nueva_hora'],
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
  cancelar_cita,
  obtener_catalogo,
  reprogramar_cita,
  anotar_lista_espera,
  registrar_venta,
];
const PRO_TOOLS = [...BASE_TOOLS, procesar_pago, aplicar_descuento];

export function getToolsForTier(tier: 'base' | 'pro'): ToolDefinition[] {
  return tier === 'pro' ? PRO_TOOLS : BASE_TOOLS;
}
