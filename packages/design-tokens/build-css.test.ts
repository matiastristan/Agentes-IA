import { describe, it, expect } from 'vitest';
import { buildDesignTokensCss } from './build-css';
import tokens from './design-tokens.json';

describe('buildDesignTokensCss', () => {
  const css = buildDesignTokensCss(tokens as never);

  it('cada bloque [data-palette] define --color-primary directamente con un valor real (no una variable sin resolver)', () => {
    for (const [name, p] of Object.entries(tokens.palettes) as [string, { primary500: string }][]) {
      const bloque = css.match(new RegExp(`\\[data-palette="${name}"\\] \\{([\\s\\S]*?)\\}`));
      expect(bloque).not.toBeNull();
      expect(bloque![1]).toContain(`--color-primary: ${p.primary500};`);
    }
  });

  it('cada bloque define también color-primary-hover, color-primary-active, color-primary-tint, color-secondary, color-accent, color-bg-tint y color-ring', () => {
    const bloqueApple = css.match(/\[data-palette="apple"\] \{([\s\S]*?)\}/)![1];
    expect(bloqueApple).toContain('--color-primary-hover:');
    expect(bloqueApple).toContain('--color-primary-active:');
    expect(bloqueApple).toContain('--color-primary-tint:');
    expect(bloqueApple).toContain('--color-secondary:');
    expect(bloqueApple).toContain('--color-accent:');
    expect(bloqueApple).toContain('--color-bg-tint:');
    expect(bloqueApple).toContain('--color-ring:');
  });

  it(':root define un valor default de --color-primary, para que la app no quede rota antes de que se aplique data-palette', () => {
    const rootBlock = css.match(/:root \{([\s\S]*?)\n\}/)![1];
    expect(rootBlock).toMatch(/--color-primary: #[0-9A-Fa-f]{6};/);
  });
});
