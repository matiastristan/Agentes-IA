import { describe, it, expect } from 'vitest';
import { buildResumenConsumo } from './build-resumen-consumo';

describe('buildResumenConsumo', () => {
  it('calcula el porcentaje usado de requests diarios a modelos gratuitos', () => {
    const r = buildResumenConsumo({
      usage: 0,
      usage_daily: 0,
      limit: null,
      limit_remaining: null,
      is_free_tier: true,
      free_model_daily_requests: { usage: 40, limit: 50 },
    });
    expect(r.requestsGratis).toEqual({ usadas: 40, limite: 50, porcentaje: 80 });
  });

  it('marca el estado como crítico cuando quedan pocas requests', () => {
    const r = buildResumenConsumo({
      usage: 0,
      usage_daily: 0,
      limit: null,
      limit_remaining: null,
      is_free_tier: true,
      free_model_daily_requests: { usage: 49, limit: 50 },
    });
    expect(r.estado).toBe('critico');
  });

  it('marca advertencia cuando pasó el 75%', () => {
    const r = buildResumenConsumo({
      usage: 0,
      usage_daily: 0,
      limit: null,
      limit_remaining: null,
      is_free_tier: true,
      free_model_daily_requests: { usage: 40, limit: 50 },
    });
    expect(r.estado).toBe('advertencia');
  });

  it('estado ok cuando hay consumo bajo', () => {
    const r = buildResumenConsumo({
      usage: 0,
      usage_daily: 0,
      limit: null,
      limit_remaining: null,
      is_free_tier: true,
      free_model_daily_requests: { usage: 5, limit: 50 },
    });
    expect(r.estado).toBe('ok');
  });

  it('agotado cuando se llegó al límite (el agente deja de responder)', () => {
    const r = buildResumenConsumo({
      usage: 0,
      usage_daily: 0,
      limit: null,
      limit_remaining: null,
      is_free_tier: true,
      free_model_daily_requests: { usage: 50, limit: 50 },
    });
    expect(r.estado).toBe('agotado');
  });

  it('sin info de requests gratuitas, no rompe y devuelve null en ese bloque', () => {
    const r = buildResumenConsumo({
      usage: 1.5,
      usage_daily: 0.3,
      limit: 10,
      limit_remaining: 8.5,
      is_free_tier: false,
    });
    expect(r.requestsGratis).toBeNull();
    expect(r.creditos).toEqual({ usados: 1.5, usadosHoy: 0.3, limite: 10, restante: 8.5 });
  });

  it('sin límite de créditos configurado, el bloque de créditos lo refleja', () => {
    const r = buildResumenConsumo({
      usage: 2,
      usage_daily: 0.5,
      limit: null,
      limit_remaining: null,
      is_free_tier: false,
    });
    expect(r.creditos.limite).toBeNull();
  });
});
