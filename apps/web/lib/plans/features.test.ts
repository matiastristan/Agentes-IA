import { describe, it, expect } from 'vitest';
import { hasFeature } from './features';

describe('hasFeature', () => {
  it('tier base tiene agente_responde', () => {
    expect(hasFeature('base', [], 'agente_responde')).toBe(true);
  });

  it('tier base NO tiene combos_promociones (feature de pro)', () => {
    expect(hasFeature('base', [], 'combos_promociones')).toBe(false);
  });

  it('tier pro tiene combos_promociones pero no cobro_mercadopago', () => {
    expect(hasFeature('pro', [], 'combos_promociones')).toBe(true);
    expect(hasFeature('pro', [], 'cobro_mercadopago')).toBe(false);
  });

  it('tier premium tiene todo: base + pro + cobro_mercadopago', () => {
    expect(hasFeature('premium', [], 'agente_responde')).toBe(true);
    expect(hasFeature('premium', [], 'combos_promociones')).toBe(true);
    expect(hasFeature('premium', [], 'cobro_mercadopago')).toBe(true);
  });

  it('un override habilitado=true desbloquea una feature fuera del tier', () => {
    const overrides = [{ feature_key: 'cobro_mercadopago', habilitado: true }];
    expect(hasFeature('base', overrides, 'cobro_mercadopago')).toBe(true);
  });

  it('un override habilitado=false bloquea una feature que el tier sí incluiría', () => {
    const overrides = [{ feature_key: 'agente_responde', habilitado: false }];
    expect(hasFeature('premium', overrides, 'agente_responde')).toBe(false);
  });

  it('un override de una feature distinta no afecta el resultado', () => {
    const overrides = [{ feature_key: 'otra_feature', habilitado: true }];
    expect(hasFeature('base', overrides, 'combos_promociones')).toBe(false);
  });

  it('tier pro tiene las 4 features nuevas de turnos', () => {
    expect(hasFeature('pro', [], 'recordatorios_configurables')).toBe(true);
    expect(hasFeature('pro', [], 'lista_espera_automatica')).toBe(true);
    expect(hasFeature('pro', [], 'reprogramacion_self_service')).toBe(true);
    expect(hasFeature('pro', [], 'gestion_senas')).toBe(true);
  });

  it('tier base NO tiene las features de turnos avanzadas', () => {
    expect(hasFeature('base', [], 'recordatorios_configurables')).toBe(false);
    expect(hasFeature('base', [], 'lista_espera_automatica')).toBe(false);
  });
});
