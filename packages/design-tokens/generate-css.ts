import tokens from './design-tokens.json' with { type: 'json' };
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function paletteBlock(name: string, p: any) {
  return `[data-palette="${name}"] {
  --palette-primary-50: ${p.primary50};
  --palette-primary-500: ${p.primary500};
  --palette-primary-600: ${p.primary600};
  --palette-primary-700: ${p.primary700};
  --palette-secondary-500: ${p.secondary500};
  --palette-accent-500: ${p.accent500};
  --palette-bg-tint: ${p.bgTint};
}`;
}

const css = `:root {
${Object.entries(tokens.gray).map(([k, v]) => `  --gray-${k}: ${v};`).join('\n')}
  --red-500: ${tokens.state.red500}; --red-600: ${tokens.state.red600}; --red-50: ${tokens.state.red50};
  --amber-500: ${tokens.state.amber500}; --amber-600: ${tokens.state.amber600}; --amber-50: ${tokens.state.amber50};
  --green-500: ${tokens.state.green500}; --green-600: ${tokens.state.green600}; --green-50: ${tokens.state.green50};
  --blue-500: ${tokens.state.blue500}; --blue-600: ${tokens.state.blue600}; --blue-50: ${tokens.state.blue50};

  --font-family-base: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  --color-background: var(--gray-50);
  --color-foreground: var(--gray-900);
  --color-card: #FFFFFF;
  --color-primary: var(--palette-primary-500);
  --color-primary-hover: var(--palette-primary-600);
  --color-primary-active: var(--palette-primary-700);
  --color-primary-foreground: #FFFFFF;
  --color-primary-tint: var(--palette-primary-50);
  --color-secondary: var(--palette-secondary-500);
  --color-accent: var(--palette-accent-500);
  --color-bg-tint: var(--palette-bg-tint);
  --color-text-primary: var(--gray-900);
  --color-text-secondary: var(--gray-500);
  --color-text-muted: var(--gray-400);
  --color-border: var(--gray-200);
  --color-ring: var(--color-primary);
  --color-success: var(--green-600); --color-success-bg: var(--green-50);
  --color-warning: var(--amber-600); --color-warning-bg: var(--amber-50);
  --color-error: var(--red-600); --color-error-bg: var(--red-50);
  --color-temp-frio: ${tokens.tempColors.frio.text}; --color-temp-frio-bg: ${tokens.tempColors.frio.bg};
  --color-temp-moderado: ${tokens.tempColors.moderado.text}; --color-temp-moderado-bg: ${tokens.tempColors.moderado.bg};
  --color-temp-caliente: ${tokens.tempColors.caliente.text}; --color-temp-caliente-bg: ${tokens.tempColors.caliente.bg};
}

${Object.entries(tokens.palettes).map(([name, p]) => paletteBlock(name, p)).join('\n\n')}
`;

const outPath = path.resolve(__dirname, '../../apps/web/styles/design-tokens.css');
writeFileSync(outPath, css);
console.log(`✅ design-tokens.css generado en ${outPath}`);
