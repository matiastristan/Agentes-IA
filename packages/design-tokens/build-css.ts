interface Palette {
  primary50: string;
  primary500: string;
  primary600: string;
  primary700: string;
  secondary500: string;
  accent500: string;
  bgTint: string;
}

interface DesignTokens {
  gray: Record<string, string>;
  palettes: Record<string, Palette>;
  state: {
    red500: string; red600: string; red50: string;
    amber500: string; amber600: string; amber50: string;
    green500: string; green600: string; green50: string;
    blue500: string; blue600: string; blue50: string;
  };
  tempColors: {
    frio: { text: string; bg: string };
    moderado: { text: string; bg: string };
    caliente: { text: string; bg: string };
  };
}

function colorVarsForPalette(p: Palette): string {
  // Estas son las variables que realmente usan los componentes (bg-primary, etc.)
  // Van acá, directo, en el mismo bloque que define los valores de la paleta —
  // nunca a través de una variable intermedia (--palette-primary-500), porque
  // esa indirección nunca se resuelve si --color-primary se calculó en :root.
  return [
    `  --color-primary: ${p.primary500};`,
    `  --color-primary-hover: ${p.primary600};`,
    `  --color-primary-active: ${p.primary700};`,
    `  --color-primary-tint: ${p.primary50};`,
    `  --color-secondary: ${p.secondary500};`,
    `  --color-accent: ${p.accent500};`,
    `  --color-bg-tint: ${p.bgTint};`,
    `  --color-ring: ${p.primary500};`,
  ].join('\n');
}

function paletteBlock(name: string, p: Palette): string {
  return `[data-palette="${name}"] {\n${colorVarsForPalette(p)}\n}`;
}

export function buildDesignTokensCss(tokens: DesignTokens): string {
  const paletteNames = Object.keys(tokens.palettes);
  const paletteDefault = tokens.palettes[paletteNames[0]];

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
  --color-primary-foreground: #FFFFFF;
${colorVarsForPalette(paletteDefault)}
  --color-text-primary: var(--gray-900);
  --color-text-secondary: var(--gray-500);
  --color-text-muted: var(--gray-400);
  --color-border: var(--gray-200);
  --color-success: var(--green-600); --color-success-bg: var(--green-50);
  --color-warning: var(--amber-600); --color-warning-bg: var(--amber-50);
  --color-error: var(--red-600); --color-error-bg: var(--red-50);
  --color-temp-frio: ${tokens.tempColors.frio.text}; --color-temp-frio-bg: ${tokens.tempColors.frio.bg};
  --color-temp-moderado: ${tokens.tempColors.moderado.text}; --color-temp-moderado-bg: ${tokens.tempColors.moderado.bg};
  --color-temp-caliente: ${tokens.tempColors.caliente.text}; --color-temp-caliente-bg: ${tokens.tempColors.caliente.bg};
}

${Object.entries(tokens.palettes).map(([name, p]) => paletteBlock(name, p)).join('\n\n')}

/* Modo oscuro: invierte SOLO los neutros (fondo, superficies, texto, bordes).
   Los colores de marca siguen viniendo del bloque [data-palette] correspondiente,
   así la paleta elegida se sigue respetando en modo oscuro. */
[data-theme="dark"] {
  --color-background: ${tokens.gray['900']};
  --color-foreground: ${tokens.gray['50']};
  --color-card: ${tokens.gray['800']};
  --color-text-primary: ${tokens.gray['50']};
  --color-text-secondary: ${tokens.gray['300']};
  --color-text-muted: ${tokens.gray['400']};
  --color-border: ${tokens.gray['700']};
  --color-bg-tint: ${tokens.gray['800']};
  --color-success-bg: #06281A;
  --color-warning-bg: #2E2206;
  --color-error-bg: #2D0F0F;
}
`;

  return css;
}
