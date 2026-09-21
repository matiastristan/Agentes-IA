export interface OpenRouterKeyInfo {
  usage: number;
  usage_daily: number;
  limit: number | null;
  limit_remaining: number | null;
  is_free_tier: boolean;
  free_model_daily_requests?: { usage: number; limit: number | null };
}

export interface ResumenConsumo {
  requestsGratis: { usadas: number; limite: number; porcentaje: number } | null;
  creditos: {
    usados: number;
    usadosHoy: number;
    limite: number | null;
    restante: number | null;
  };
  estado: 'ok' | 'advertencia' | 'critico' | 'agotado';
  esTierGratuito: boolean;
}

function estadoSegunPorcentaje(pct: number): ResumenConsumo['estado'] {
  if (pct >= 100) return 'agotado';
  if (pct >= 95) return 'critico';
  if (pct >= 75) return 'advertencia';
  return 'ok';
}

/**
 * Normaliza la respuesta de GET /api/v1/key de OpenRouter en algo que el panel
 * pueda mostrar directamente.
 *
 * El dato clave para este proyecto es free_model_daily_requests: los modelos
 * gratuitos tienen un techo de requests por día, y cuando se agota el agente
 * deja de responder por WhatsApp sin ningún aviso visible.
 */
export function buildResumenConsumo(info: OpenRouterKeyInfo): ResumenConsumo {
  const gratis = info.free_model_daily_requests;

  let requestsGratis: ResumenConsumo['requestsGratis'] = null;
  let estado: ResumenConsumo['estado'] = 'ok';

  if (gratis && typeof gratis.limit === 'number' && gratis.limit > 0) {
    const porcentaje = Math.round((gratis.usage / gratis.limit) * 100);
    requestsGratis = { usadas: gratis.usage, limite: gratis.limit, porcentaje };
    estado = estadoSegunPorcentaje(porcentaje);
  } else if (typeof info.limit === 'number' && info.limit > 0) {
    const porcentaje = Math.round((info.usage / info.limit) * 100);
    estado = estadoSegunPorcentaje(porcentaje);
  }

  return {
    requestsGratis,
    creditos: {
      usados: info.usage,
      usadosHoy: info.usage_daily,
      limite: info.limit,
      restante: info.limit_remaining,
    },
    estado,
    esTierGratuito: info.is_free_tier,
  };
}
