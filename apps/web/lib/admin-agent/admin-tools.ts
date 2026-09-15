import type { ToolDefinition } from '@/lib/agent/tools';

const consultar_metricas_plataforma: ToolDefinition = {
  type: 'function',
  function: {
    name: 'consultar_metricas_plataforma',
    description:
      'Consulta cuántos negocios hay en la plataforma, cuántos están activos, y su distribución por tipo de CRM (ventas/turnos). Nunca incluye datos de ventas o facturación de los negocios en sí.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
};

const consultar_facturacion_propia: ToolDefinition = {
  type: 'function',
  function: {
    name: 'consultar_facturacion_propia',
    description:
      'Consulta el total facturado por el dueño de la plataforma a sus negocios clientes (plan + adicionales vendidos). Nunca lo que cada negocio le factura a sus propios clientes.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
};

export const ADMIN_TOOLS: ToolDefinition[] = [
  consultar_metricas_plataforma,
  consultar_facturacion_propia,
];
