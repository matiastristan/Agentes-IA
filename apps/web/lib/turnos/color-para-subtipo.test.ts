import { describe, it, expect } from 'vitest';
import { colorParaSubtipo } from './color-para-subtipo';

describe('colorParaSubtipo', () => {
  it('el mismo subtipo siempre devuelve el mismo color', () => {
    expect(colorParaSubtipo('futbol_5')).toBe(colorParaSubtipo('futbol_5'));
  });

  it('todas las variantes de fútbol comparten el mismo color (misma familia)', () => {
    expect(colorParaSubtipo('futbol_5')).toBe(colorParaSubtipo('futbol_7'));
    expect(colorParaSubtipo('futbol_5')).toBe(colorParaSubtipo('futbol_11'));
  });

  it('todas las variantes de pádel comparten el mismo color', () => {
    expect(colorParaSubtipo('Padel_1')).toBe(colorParaSubtipo('Padel_2'));
  });

  it('fútbol y pádel tienen colores DISTINTOS entre sí', () => {
    expect(colorParaSubtipo('futbol_5')).not.toBe(colorParaSubtipo('Padel_1'));
  });

  it('no distingue mayúsculas (Padel y padel son la misma familia)', () => {
    expect(colorParaSubtipo('Padel_1')).toBe(colorParaSubtipo('padel_1'));
  });

  it('un subtipo desconocido sigue teniendo un color estable', () => {
    expect(colorParaSubtipo('tenis_1')).toBe(colorParaSubtipo('tenis_1'));
  });

  it('sin subtipo, devuelve un color neutro por default', () => {
    expect(colorParaSubtipo(null)).toBeDefined();
  });
});
