# Design System — SaaS Agente IA Multi-Tenant

**Versión**: 1.0
**Arquitectura**: 3 capas (Primitive → Semantic → Component)
**Multi-tema**: 3 paletas dinámicas vía `data-palette` attribute

Este documento es la fuente de verdad de diseño. Ningún componente debe usar
valores hardcodeados (hex, px sueltos) — todo referencia un token.

---

## 1. PRIMITIVE TOKENS (valores crudos)

### 1.1 Grises (universales, NO cambian con la paleta)

```css
:root {
  --gray-50:  #FAFAFA;
  --gray-100: #F5F5F5;
  --gray-200: #E0E0E0;
  --gray-300: #CBD5E1;
  --gray-400: #9CA3AF;
  --gray-500: #6B7280;
  --gray-600: #4B5563;
  --gray-700: #374151;
  --gray-800: #1F2937;
  --gray-900: #111827;
}
```

### 1.2 Colores de las 3 paletas (primitivos por tema)

```css
/* WARM — Barberías, Estética, Pet Shop, servicios "energéticos" */
[data-palette="warm"] {
  --palette-primary-50:  #FFF1EC;
  --palette-primary-500: #EF6B4B;
  --palette-primary-600: #DA5636;
  --palette-primary-700: #B8432A;
  --palette-secondary-500: #FFB347;
  --palette-accent-500: #FF6B6B;
  --palette-bg-tint: #FFF5F2;
}

/* COOL — Clínicas, profesionales, corporativo (default) */
[data-palette="cool"] {
  --palette-primary-50:  #EEF0FF;
  --palette-primary-500: #4B5EFC;
  --palette-primary-600: #3B4DE0;
  --palette-primary-700: #2E3EBD;
  --palette-secondary-500: #8B9EFF;
  --palette-accent-500: #7C3AED;
  --palette-bg-tint: #F0F4FF;
}

/* VIBRANT — Pet Shop, wellness, outdoor */
[data-palette="vibrant"] {
  --palette-primary-50:  #ECFDF5;
  --palette-primary-500: #10B981;
  --palette-primary-600: #0D9B6C;
  --palette-primary-700: #0A7D57;
  --palette-secondary-500: #F59E0B;
  --palette-accent-500: #06B6D4;
  --palette-bg-tint: #F0FDF4;
}
```

### 1.3 Colores de estado (universales, no cambian con la paleta)

```css
:root {
  --red-500: #EF4444;    --red-600: #DC2626;   --red-50: #FEF2F2;
  --amber-500: #F59E0B;  --amber-600: #D97706;  --amber-50: #FFFBEB;
  --green-500: #22C55E;  --green-600: #16A34A;  --green-50: #F0FDF4;
  --blue-500: #3B82F6;   --blue-600: #2563EB;   --blue-50: #EFF6FF;
}
```

### 1.4 Tipografía (primitivos)

```css
:root {
  --font-family-base: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-family-mono: 'JetBrains Mono', monospace;

  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
}
```

### 1.5 Espaciado (escala 4px)

```css
:root {
  --space-0: 0px;
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
}
```

### 1.6 Radios y sombras

```css
:root {
  --radius-sm: 0.375rem;  /* 6px  — inputs, badges */
  --radius-md: 0.5rem;    /* 8px  — buttons, cards pequeñas */
  --radius-lg: 0.75rem;   /* 12px — cards, modales */
  --radius-xl: 1rem;      /* 16px — contenedores grandes */
  --radius-full: 9999px;  /* pills, avatares, badges de temperatura */

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);
}
```

---

## 2. SEMANTIC TOKENS (alias por propósito)

Estos son los que se usan en componentes. Referencian los primitivos y
cambian automáticamente según `data-palette`.

```css
:root {
  /* Superficie / fondo */
  --color-background: var(--gray-50);
  --color-foreground: var(--gray-900);
  --color-card: #FFFFFF;
  --color-card-foreground: var(--gray-900);
  --color-sidebar: #FFFFFF;

  /* Primario (dinámico por paleta) */
  --color-primary: var(--palette-primary-500);
  --color-primary-hover: var(--palette-primary-600);
  --color-primary-active: var(--palette-primary-700);
  --color-primary-foreground: #FFFFFF;
  --color-primary-tint: var(--palette-primary-50);

  /* Secundario (dinámico) */
  --color-secondary: var(--palette-secondary-500);
  --color-secondary-foreground: var(--gray-900);

  /* Accent (dinámico) — hover/focus/active states */
  --color-accent: var(--palette-accent-500);
  --color-accent-foreground: #FFFFFF;

  /* Fondo con tinte de marca (dinámico) */
  --color-bg-tint: var(--palette-bg-tint);

  /* Texto */
  --color-text-primary: var(--gray-900);
  --color-text-secondary: var(--gray-500);
  --color-text-muted: var(--gray-400);
  --color-text-on-primary: #FFFFFF;

  /* Bordes */
  --color-border: var(--gray-200);
  --color-input-border: var(--gray-300);
  --color-ring: var(--color-primary);

  /* Estado — UNIVERSALES, no dependen de la paleta */
  --color-success: var(--green-600);
  --color-success-bg: var(--green-50);
  --color-warning: var(--amber-600);
  --color-warning-bg: var(--amber-50);
  --color-error: var(--red-600);
  --color-error-bg: var(--red-50);
  --color-info: var(--blue-600);
  --color-info-bg: var(--blue-50);

  /* Temperatura de clientes — UNIVERSAL, mismo significado en todo tema */
  --color-temp-frio: var(--blue-600);
  --color-temp-frio-bg: var(--blue-50);
  --color-temp-moderado: var(--amber-600);
  --color-temp-moderado-bg: var(--amber-50);
  --color-temp-caliente: var(--red-600);
  --color-temp-caliente-bg: var(--red-50);

  /* Opacidad / transiciones */
  --opacity-disabled: 0.5;
  --transition-colors: color 150ms ease, background-color 150ms ease, border-color 150ms ease;
  --transition-transform: transform 150ms ease;
}
```

### 2.1 Tipografía semántica

```css
:root {
  --text-page-title: var(--font-size-2xl);      /* h1 de página */
  --text-section-title: var(--font-size-xl);    /* h2 de sección */
  --text-card-title: var(--font-size-lg);       /* título de card */
  --text-body: var(--font-size-base);
  --text-body-sm: var(--font-size-sm);
  --text-label: var(--font-size-sm);
  --text-caption: var(--font-size-xs);
  --text-kpi-number: var(--font-size-4xl);      /* número grande en KPI card */
}
```

### 2.2 Espaciado semántico

```css
:root {
  --spacing-page-x: var(--space-6);
  --spacing-page-y: var(--space-6);
  --spacing-section: var(--space-8);
  --spacing-card-padding: var(--space-6);
  --spacing-form-gap: var(--space-4);
  --spacing-sidebar-width: 260px;
  --spacing-sidebar-width-collapsed: 72px;
  --spacing-header-height: 64px;
}
```

**Por qué esta separación importa**: el día que agreguemos dark mode o un
4to tema, solo se tocan las capas semantic/primitive — ningún componente
cambia.

---

## 3. COMPONENT TOKENS Y SPECS

### 3.1 Button

```css
:root {
  --button-radius: var(--radius-md);
  --button-padding-y: var(--space-2);
  --button-padding-x: var(--space-4);
  --button-font-weight: var(--font-weight-medium);
  --button-height-sm: 32px;
  --button-height-md: 40px;
  --button-height-lg: 48px;
}
```

| Variante | Default | Hover | Active | Disabled |
|---|---|---|---|---|
| **Primary** | bg `--color-primary`, texto `--color-primary-foreground` | bg `--color-primary-hover` | bg `--color-primary-active` | opacity `--opacity-disabled`, sin pointer |
| **Secondary** | bg `--color-bg-tint`, texto `--color-primary`, borde `--color-primary` | bg `--color-primary-tint` | bg un tono más oscuro | opacity 0.5 |
| **Ghost** | transparente, texto `--color-text-secondary` | bg `--gray-100` | bg `--gray-200` | opacity 0.5 |
| **Danger** | bg `--color-error`, texto blanco | bg `--red-500` más oscuro (~10%) | — | opacity 0.5 |

Todos: `transition: var(--transition-colors)`, focus visible con `2px solid var(--color-ring)` + `offset 2px`.

### 3.2 Input / Textarea

```css
:root {
  --input-radius: var(--radius-sm);
  --input-height: 40px;
  --input-padding-x: var(--space-3);
  --input-border-width: 1px;
  --input-border-color: var(--color-input-border);
  --input-border-color-focus: var(--color-primary);
  --input-border-color-error: var(--color-error);
}
```

| Estado | Borde | Fondo | Extra |
|---|---|---|---|
| Default | `--input-border-color` | white | — |
| Focus | `--input-border-color-focus` 2px | white | ring `--color-ring` 20% opacity |
| Error | `--input-border-color-error` | `--color-error-bg` | texto de error debajo, `--text-caption`, color `--color-error` |
| Disabled | `--gray-200` | `--gray-100` | texto `--color-text-muted` |

Inputs editables inline en tablas (ej: stock en Catálogo) usan el mismo
spec pero sin borde visible hasta `:focus` — solo fondo `transparent` →
`--gray-50` en hover, para no saturar visualmente la tabla.

### 3.3 Card

```css
:root {
  --card-radius: var(--radius-lg);
  --card-padding: var(--spacing-card-padding);
  --card-bg: var(--color-card);
  --card-border: 1px solid var(--color-border);
  --card-shadow: var(--shadow-sm);
  --card-shadow-hover: var(--shadow-md);
}
```

### 3.4 KPI Card (Dashboard)

Card especializada — número grande + label + tendencia opcional.

```
┌─────────────────────────┐
│ Mensajes hoy             │  ← --text-label, --color-text-secondary
│ 142                       │  ← --text-kpi-number, --font-weight-bold, --color-text-primary
│ ↑ 12% vs ayer             │  ← --text-caption, verde si sube / rojo si baja
└─────────────────────────┘
```
- Ícono opcional arriba a la derecha, color `--color-primary` en fondo `--color-primary-tint` circular.
- Tendencia: `--color-success` con ↑ o `--color-error` con ↓.

### 3.5 Badge de Temperatura 🔥

Componente crítico y repetido en toda la tabla de Conversaciones.

```css
:root {
  --badge-radius: var(--radius-full);
  --badge-padding-x: var(--space-3);
  --badge-padding-y: var(--space-1);
  --badge-font-size: var(--text-caption);
  --badge-font-weight: var(--font-weight-semibold);
}
```

| Temperatura | Fondo | Texto | Ícono |
|---|---|---|---|
| 🔵 FRÍO | `--color-temp-frio-bg` | `--color-temp-frio` | copo/gota |
| 🟡 MODERADO | `--color-temp-moderado-bg` | `--color-temp-moderado` | termómetro medio |
| 🔴 CALIENTE | `--color-temp-caliente-bg` | `--color-temp-caliente` | fuego |

Estos 3 colores **son universales** (no dependen de `data-palette`) — la
temperatura debe leerse igual sin importar el rubro del negocio.

Al hacer override manual (vendedor cambia la temperatura), el badge
muestra un ícono pequeño de "editado manualmente" (lápiz, `--color-text-muted`)
con tooltip: "Cambiado por [vendedor] el [fecha]".

### 3.6 Table (CRM Conversaciones, Catálogo)

```css
:root {
  --table-row-height: 56px;
  --table-header-bg: var(--gray-50);
  --table-header-text: var(--color-text-secondary);
  --table-border: 1px solid var(--color-border);
  --table-row-hover: var(--gray-50);
  --table-cell-padding-x: var(--space-4);
}
```

- Header: `--font-weight-semibold`, `--text-caption`, uppercase, `--table-header-text`.
- Fila hover: `--table-row-hover` (sutil, para indicar clickeable → abre detalle).
- Celdas editables inline (stock): al hacer click, se convierte en `Input` (spec 3.2) sin mover el layout — mismo alto de fila.
- Loading state: skeleton rows con `--gray-100` pulsante.
- Empty state: ícono + texto centrado, `--color-text-muted`, con CTA si aplica ("Aún no tenés conversaciones").

### 3.7 Toggle Switch (Horarios: Abierto/Cerrado)

```css
:root {
  --toggle-width: 44px;
  --toggle-height: 24px;
  --toggle-bg-off: var(--gray-300);
  --toggle-bg-on: var(--color-primary);
  --toggle-thumb: #FFFFFF;
}
```

### 3.8 Modal / Dialog

```css
:root {
  --modal-radius: var(--radius-xl);
  --modal-padding: var(--space-6);
  --modal-max-width: 560px;
  --modal-overlay: rgb(0 0 0 / 0.4);
  --modal-shadow: var(--shadow-lg);
}
```

Usado en: edición completa de variante de producto, wizard de conexión Meta, confirmaciones de acciones destructivas.

### 3.9 Toast / Notification

```css
:root {
  --toast-radius: var(--radius-md);
  --toast-padding: var(--space-4);
  --toast-shadow: var(--shadow-lg);
}
```

| Tipo | Borde izq. | Ícono | Uso |
|---|---|---|---|
| Success | `--color-success` | check | "Stock actualizado" |
| Error | `--color-error` | x | "No se pudo guardar" |
| Info | `--color-info` | i | "Sincronizando catálogo..." |

Posición: bottom-right desktop, bottom full-width mobile. Auto-dismiss 4s (success/info), persistente hasta cerrar manual (error).

### 3.10 Sidebar Navigation

```css
:root {
  --sidebar-width: var(--spacing-sidebar-width);
  --sidebar-bg: var(--color-sidebar);
  --sidebar-item-height: 44px;
  --sidebar-item-radius: var(--radius-md);
  --sidebar-item-active-bg: var(--color-primary-tint);
  --sidebar-item-active-text: var(--color-primary);
  --sidebar-item-hover-bg: var(--gray-100);
}
```

Estructura (confirmada en brainstorming):
```
Logo + nombre negocio
─────────────────────
Dashboard
Conversaciones
Catálogo
Horarios
Configuración ▾
  ├─ Cuenta Meta
  ├─ System Prompt
  ├─ General
Analytics
─────────────────────
Perfil / Logout
```

Item activo: barra izquierda 3px `--color-primary` + fondo `--sidebar-item-active-bg`.

### 3.11 Status Badge de Conexión Meta

Específico para la página "Conectar WhatsApp" (diseño ya validado):

| Estado | Fondo | Texto | Punto |
|---|---|---|---|
| 🟢 Conectado | `--color-success-bg` | `--color-success` | pulso animado sutil (2s ease infinite) |
| 🔴 No conectado | `--color-error-bg` | `--color-error` | estático |

---

## 4. STATES & VARIANTS (resumen transversal)

Todo componente interactivo define estos 5 estados como mínimo:

| Estado | Regla general |
|---|---|
| Default | Tokens semánticos base |
| Hover | Un paso más oscuro/saturado en la escala del color usado |
| Focus | Ring `2px solid var(--color-ring)`, offset `2px` — nunca `outline: none` sin reemplazo |
| Active/Pressed | Dos pasos más oscuro, o `scale(0.98)` con `--transition-transform` |
| Disabled | `opacity: var(--opacity-disabled)`, `cursor: not-allowed`, sin hover |

Loading: spinner o skeleton usando `--gray-100` / `--gray-200` en pulso, nunca bloquear toda la pantalla salvo auth.

---

## 5. TIPOGRAFÍA — JERARQUÍA DE USO

| Elemento | Token tamaño | Weight | Color |
|---|---|---|---|
| H1 (título de página) | `--text-page-title` | semibold | `--color-text-primary` |
| H2 (sección) | `--text-section-title` | semibold | `--color-text-primary` |
| Título de card | `--text-card-title` | medium | `--color-text-primary` |
| Número KPI | `--text-kpi-number` | bold | `--color-text-primary` |
| Body | `--text-body` | regular | `--color-text-primary` |
| Label de input | `--text-label` | medium | `--color-text-secondary` |
| Caption / helper | `--text-caption` | regular | `--color-text-muted` |

Máximo 2 weights por pantalla (regular + semibold) salvo el número de KPI que puede ser bold. Una sola familia tipográfica: Inter.

---

## 6. GRID Y BREAKPOINTS (mobile-first)

```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

- **< 768px (mobile)**: sidebar colapsa a bottom-nav o hamburger; tablas se convierten en cards apiladas; KPIs en 1 columna.
- **768–1024px (tablet)**: sidebar colapsado a solo íconos (`--spacing-sidebar-width-collapsed`); KPIs en 2 columnas.
- **> 1024px (desktop)**: layout completo, sidebar expandido, KPIs en 3-4 columnas, tabla completa.

Contenido máximo: `max-width: 1440px` centrado, padding lateral `--spacing-page-x`.

---

## 7. ACCESIBILIDAD (WCAG 2.1 AA)

- Contraste texto/fondo mínimo 4.5:1 — verificar los 3 primarios de paleta contra blanco y contra `--color-bg-tint`.
- Todo ícono interactivo sin texto visible lleva `aria-label`.
- Focus visible obligatorio en todo elemento interactivo (nunca `outline:none` puro).
- Badges de temperatura y estado de conexión: el color NUNCA es el único indicador — siempre acompañado de texto o ícono.
- Formularios: cada input con `<label>` asociado, errores anunciados vía `aria-describedby`.
- Touch targets mínimo 44x44px en mobile (botones, toggle, items de sidebar).

---

## 8. TAILWIND INTEGRATION

```js
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        card: 'var(--color-card)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          foreground: 'var(--color-primary-foreground)',
          tint: 'var(--color-primary-tint)',
        },
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        border: 'var(--color-border)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        'temp-frio': 'var(--color-temp-frio)',
        'temp-moderado': 'var(--color-temp-moderado)',
        'temp-caliente': 'var(--color-temp-caliente)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        sans: ['var(--font-family-base)'],
      },
      spacing: {
        'sidebar': 'var(--spacing-sidebar-width)',
        'header': 'var(--spacing-header-height)',
      },
    },
  },
}
```

Regla del proyecto: **nunca** `bg-[#4B5EFC]` hardcodeado en JSX — siempre `bg-primary`, `text-primary-foreground`, etc. Se valida con `design-system:validate-tokens.cjs` en CI (Fase 7).

---

## 9. CÓMO CAMBIAR DE TEMA (runtime)

```js
// Al login o al cambiar en Settings > General
document.documentElement.setAttribute('data-palette', negocio.color_palette);
// valores posibles: 'warm' | 'cool' | 'vibrant'
```

Como los semantic tokens (`--color-primary`, etc.) apuntan a los primitivos
de paleta (`--palette-primary-500`, etc.), el cambio es instantáneo y no
requiere recargar ni tocar ningún componente.

---

## 10. CHECKLIST DE CUMPLIMIENTO (por componente nuevo)

Antes de dar por terminado un componente:

- [ ] Cero valores hex/px hardcodeados — todo vía `var(--token)` o clase Tailwind mapeada
- [ ] Los 5 estados (default/hover/focus/active/disabled) definidos
- [ ] Funciona igual de bien en las 3 paletas (probar `data-palette="warm|cool|vibrant"`)
- [ ] Responsive: mobile, tablet, desktop
- [ ] Contraste AA verificado
- [ ] Si es interactivo: `aria-label` o `<label>` asociado
