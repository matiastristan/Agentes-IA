export type Tier = 'base' | 'pro' | 'premium';

export type FeatureKey =
  | 'agente_responde'
  | 'agendar_citas'
  | 'notificaciones'
  | 'derivar_vendedor'
  | 'memoria_conversacional'
  | 'combos_promociones'
  | 'descuentos_configurables'
  | 'saludo_cumpleanos'
  | 'turnos_fijos_mensualizados'
  | 'cuenta_corriente'
  | 'cobro_mercadopago'
  | 'transferencias'
  | 'comprobantes'
  | 'billeteras_virtuales'
  | 'recordatorios_configurables'
  | 'lista_espera_automatica'
  | 'reprogramacion_self_service'
  | 'gestion_senas';

const BASE_FEATURES: FeatureKey[] = [
  'agente_responde',
  'agendar_citas',
  'notificaciones',
  'derivar_vendedor',
  'memoria_conversacional',
];

const PRO_FEATURES: FeatureKey[] = [
  ...BASE_FEATURES,
  'combos_promociones',
  'descuentos_configurables',
  'saludo_cumpleanos',
  'turnos_fijos_mensualizados',
  'cuenta_corriente',
  'recordatorios_configurables',
  'lista_espera_automatica',
  'reprogramacion_self_service',
  'gestion_senas',
];

const PREMIUM_FEATURES: FeatureKey[] = [
  ...PRO_FEATURES,
  'cobro_mercadopago',
  'transferencias',
  'comprobantes',
  'billeteras_virtuales',
];

export const TIER_FEATURES: Record<Tier, FeatureKey[]> = {
  base: BASE_FEATURES,
  pro: PRO_FEATURES,
  premium: PREMIUM_FEATURES,
};

interface FeatureOverride {
  feature_key: string;
  habilitado: boolean;
}

export function hasFeature(
  tier: Tier,
  overrides: FeatureOverride[],
  featureKey: FeatureKey
): boolean {
  const override = overrides.find((o) => o.feature_key === featureKey);
  if (override) return override.habilitado;

  return TIER_FEATURES[tier].includes(featureKey);
}
