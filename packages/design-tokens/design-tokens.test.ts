import { describe, it, expect } from 'vitest';
import tokens from './design-tokens.json';

describe('design tokens', () => {
  it('define las 3 paletas disponibles', () => {
    expect(Object.keys(tokens.palettes)).toEqual(['apple', 'notion', 'spotify']);
  });

  it('cada paleta define primary, secondary, accent y bgTint', () => {
    for (const palette of Object.values(tokens.palettes) as any[]) {
      expect(palette).toHaveProperty('primary500');
      expect(palette).toHaveProperty('secondary500');
      expect(palette).toHaveProperty('accent500');
      expect(palette).toHaveProperty('bgTint');
    }
  });

  it('los colores de temperatura son universales (no están dentro de palettes)', () => {
    expect(tokens.tempColors).toHaveProperty('frio');
    expect(tokens.tempColors).toHaveProperty('moderado');
    expect(tokens.tempColors).toHaveProperty('caliente');
  });
});
