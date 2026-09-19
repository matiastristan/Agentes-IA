import { describe, it, expect } from 'vitest';
import { colorParaSubtipo } from './color-para-subtipo';

describe('colorParaSubtipo', () => {
  it('el mismo subtipo siempre devuelve el mismo color', () => {
    expect(colorParaSubtipo('futbol_5')).toBe(colorParaSubtipo('futbol_5'));
  });

  it('subtipos distintos tienden a devolver colores distintos', () => {
    expect(colorParaSubtipo('futbol_5')).not.toBe(colorParaSubtipo('futbol_7'));
  });

  it('sin subtipo, devuelve un color neutro por default', () => {
    expect(colorParaSubtipo(null)).toBeDefined();
  });
});
