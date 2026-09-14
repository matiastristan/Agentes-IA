# FASE 1: Architecture & Design System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el repo, el sistema de diseño (tokens + componentes base) y el schema de base de datos multi-tenant con RLS listos y testeados, como fundación para FASE 2 (Auth) y FASE 3 (Agente IA).

**Architecture:** Monorepo Next.js 14 (App Router) + Tailwind + shadcn/ui, con tokens CSS de 3 capas (`docs/design-system/design-tokens.md` es la fuente de verdad) inyectados vía `data-palette` attribute. Base de datos PostgreSQL en Supabase con RLS por `tenant_id` en todas las tablas de negocio.

**Tech Stack:** Next.js 14, React 19, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres + Auth + RLS), Vitest (unit/RLS tests), pnpm.

## Global Constraints

- Node >= 20, pnpm >= 9 (no npm/yarn — evita lockfiles duplicados)
- TypeScript strict mode obligatorio (`"strict": true` en `tsconfig.json`)
- Cero valores hex/px hardcodeados en componentes — todo vía tokens definidos en `docs/design-system/design-tokens.md` (ver checklist sección 10 de ese doc)
- Todas las tablas de negocio (`negocio`, `productos`, `conversations`, `messages`, `citas`) llevan columna `tenant_id UUID NOT NULL` + policy RLS `USING (tenant_id = auth.uid())`
- Todo componente nuevo soporta los 3 `data-palette` (`warm`, `cool`, `vibrant`) sin cambios de código
- Commits frecuentes, un commit por step de tipo "Commit"

---

## File Structure

```
saas-agente-ia/
├── apps/
│   └── web/                          # Next.js 14 app
│       ├── app/
│       │   ├── globals.css           # Importa design-tokens.css
│       │   └── layout.tsx
│       ├── components/
│       │   └── ui/
│       │       ├── button.tsx
│       │       ├── input.tsx
│       │       ├── card.tsx
│       │       ├── badge-temperatura.tsx
│       │       └── kpi-card.tsx
│       ├── styles/
│       │   └── design-tokens.css     # Generado desde design-tokens.json
│       ├── tailwind.config.ts
│       └── package.json
├── packages/
│   └── design-tokens/
│       └── design-tokens.json        # Fuente única de tokens (3 capas)
├── supabase/
│   ├── migrations/
│   │   ├── 0001_create_negocio.sql
│   │   ├── 0002_create_productos.sql
│   │   ├── 0003_create_conversations_messages.sql
│   │   ├── 0004_create_citas.sql
│   │   └── 0005_rls_policies.sql
│   └── tests/
│       └── rls.test.ts
└── docs/
    └── design-system/design-tokens.md   # (ya creado — fuente de verdad de diseño)
```

Cada tabla vive en su propia migración (cambian juntas, se leen juntas). Componentes UI van uno por archivo — se testean y revisan independientemente.

---

## Task 1: Monorepo & Next.js scaffold

**Files:**
- Create: `package.json` (root, workspaces)
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`

**Interfaces:**
- Produces: comando `pnpm dev` levanta Next.js en `localhost:3000`; comando `pnpm test` corre Vitest en todo el monorepo.

- [ ] **Step 1: Crear estructura de monorepo con pnpm workspaces**

```json
// package.json (root)
{
  "name": "saas-agente-ia",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "pnpm --filter web dev",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Scaffolding Next.js dentro de apps/web**

Run: `cd apps/web && pnpm create next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"`

Expected: carpeta `apps/web` con `app/`, `tailwind.config.ts`, `tsconfig.json` generados.

- [ ] **Step 3: Verificar que levanta**

Run: `pnpm dev`
Expected: servidor en `http://localhost:3000` sirve la página default de Next sin errores en consola.

- [ ] **Step 4: Commit**

```bash
git add package.json apps/web
git commit -m "chore: scaffold monorepo + Next.js 14 app"
```

---

## Task 2: Design tokens — JSON fuente + generación CSS

**Files:**
- Create: `packages/design-tokens/design-tokens.json`
- Create: `apps/web/styles/design-tokens.css` (generado, no editar a mano)
- Test: `packages/design-tokens/design-tokens.test.ts`

**Interfaces:**
- Consumes: contenido de `docs/design-system/design-tokens.md` secciones 1–3 (primitivos, semánticos, componentes)
- Produces: archivo `design-tokens.css` con custom properties importable desde `apps/web/app/globals.css`; export `PALETTES = ['warm', 'cool', 'vibrant']` desde `packages/design-tokens/index.ts` para usar en el selector de Settings (Fase 4).

- [ ] **Step 1: Escribir test que valida que las 3 paletas generan las mismas variables semánticas**

```ts
// packages/design-tokens/design-tokens.test.ts
import { describe, it, expect } from 'vitest';
import tokens from './design-tokens.json';

describe('design tokens', () => {
  it('define las 3 paletas requeridas', () => {
    expect(Object.keys(tokens.palettes)).toEqual(['warm', 'cool', 'vibrant']);
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
```

- [ ] **Step 2: Correr test, debe fallar (archivo JSON no existe)**

Run: `pnpm vitest run packages/design-tokens/design-tokens.test.ts`
Expected: FAIL — "Cannot find module './design-tokens.json'"

- [ ] **Step 3: Crear el JSON fuente (contenido exacto de las 3 paletas de la sección 1.2 del design doc)**

```json
// packages/design-tokens/design-tokens.json
{
  "gray": {
    "50": "#FAFAFA", "100": "#F5F5F5", "200": "#E0E0E0", "300": "#CBD5E1",
    "400": "#9CA3AF", "500": "#6B7280", "600": "#4B5563", "700": "#374151",
    "800": "#1F2937", "900": "#111827"
  },
  "palettes": {
    "warm": { "primary50": "#FFF1EC", "primary500": "#EF6B4B", "primary600": "#DA5636", "primary700": "#B8432A", "secondary500": "#FFB347", "accent500": "#FF6B6B", "bgTint": "#FFF5F2" },
    "cool": { "primary50": "#EEF0FF", "primary500": "#4B5EFC", "primary600": "#3B4DE0", "primary700": "#2E3EBD", "secondary500": "#8B9EFF", "accent500": "#7C3AED", "bgTint": "#F0F4FF" },
    "vibrant": { "primary50": "#ECFDF5", "primary500": "#10B981", "primary600": "#0D9B6C", "primary700": "#0A7D57", "secondary500": "#F59E0B", "accent500": "#06B6D4", "bgTint": "#F0FDF4" }
  },
  "state": {
    "red500": "#EF4444", "red600": "#DC2626", "red50": "#FEF2F2",
    "amber500": "#F59E0B", "amber600": "#D97706", "amber50": "#FFFBEB",
    "green500": "#22C55E", "green600": "#16A34A", "green50": "#F0FDF4",
    "blue500": "#3B82F6", "blue600": "#2563EB", "blue50": "#EFF6FF"
  },
  "tempColors": {
    "frio": { "text": "#2563EB", "bg": "#EFF6FF" },
    "moderado": { "text": "#D97706", "bg": "#FFFBEB" },
    "caliente": { "text": "#DC2626", "bg": "#FEF2F2" }
  }
}
```

- [ ] **Step 4: Correr test, debe pasar**

Run: `pnpm vitest run packages/design-tokens/design-tokens.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Escribir script que genera el CSS a partir del JSON**

```ts
// packages/design-tokens/generate-css.ts
import tokens from './design-tokens.json';
import { writeFileSync } from 'fs';

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

writeFileSync('../../apps/web/styles/design-tokens.css', css);
console.log('✅ design-tokens.css generado');
```

- [ ] **Step 6: Correr el generador y verificar el archivo de salida**

Run: `pnpm tsx packages/design-tokens/generate-css.ts`
Expected: se crea `apps/web/styles/design-tokens.css`; `grep "data-palette=\"vibrant\"" apps/web/styles/design-tokens.css` devuelve una coincidencia.

- [ ] **Step 7: Importar el CSS generado en la app**

En `apps/web/app/globals.css`, agregar como primera línea:
```css
@import '../styles/design-tokens.css';
```

- [ ] **Step 8: Commit**

```bash
git add packages/design-tokens apps/web/styles apps/web/app/globals.css
git commit -m "feat: design tokens de 3 capas + generador CSS + 3 paletas"
```

---

## Task 3: Componente Button

**Files:**
- Create: `apps/web/components/ui/button.tsx`
- Test: `apps/web/components/ui/button.test.tsx`

**Interfaces:**
- Consumes: clases Tailwind mapeadas a tokens (Task 2 debe estar hecho — `--color-primary` etc. deben existir)
- Produces: `<Button variant="primary" | "secondary" | "ghost" | "danger" size="sm" | "md" | "lg">` — usado por todos los componentes posteriores (KPI card actions, modales, formularios)

- [ ] **Step 1: Escribir test de variantes y estado disabled**

```tsx
// apps/web/components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renderiza el texto pasado como children', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('aplica la clase de variante primary por default', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });

  it('aplica la clase de variante danger cuando se pasa variant="danger"', () => {
    render(<Button variant="danger">Borrar</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-error');
  });

  it('deshabilita el botón y no dispara onClick cuando disabled=true', () => {
    render(<Button disabled>Guardar</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

- [ ] **Step 2: Correr test, debe fallar**

Run: `pnpm vitest run apps/web/components/ui/button.test.tsx`
Expected: FAIL — "Cannot find module './button'"

- [ ] **Step 3: Implementar el componente**

```tsx
// apps/web/components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
  secondary: 'bg-primary-tint text-primary border border-primary hover:bg-primary/10',
  ghost: 'bg-transparent text-foreground/70 hover:bg-gray-100',
  danger: 'bg-error text-white hover:opacity-90',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
```

- [ ] **Step 4: Correr test, debe pasar**

Run: `pnpm vitest run apps/web/components/ui/button.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/ui/button.tsx apps/web/components/ui/button.test.tsx
git commit -m "feat: componente Button con 4 variantes y 3 tamaños"
```

---

## Task 4: Componente BadgeTemperatura

**Files:**
- Create: `apps/web/components/ui/badge-temperatura.tsx`
- Test: `apps/web/components/ui/badge-temperatura.test.tsx`

**Interfaces:**
- Consumes: tipo `Temperatura = 'frio' | 'moderado' | 'caliente'` (definir en `apps/web/types/crm.ts`)
- Produces: `<BadgeTemperatura value="caliente" editadoManualmente={boolean} />` — usado en la tabla de Conversaciones (Fase 4)

- [ ] **Step 1: Escribir test de las 3 variantes + indicador de edición manual**

```tsx
// apps/web/components/ui/badge-temperatura.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BadgeTemperatura } from './badge-temperatura';

describe('BadgeTemperatura', () => {
  it('muestra el texto CALIENTE con clase de color correspondiente', () => {
    render(<BadgeTemperatura value="caliente" />);
    const badge = screen.getByText('Caliente');
    expect(badge).toHaveClass('text-temp-caliente');
  });

  it('muestra el texto FRÍO con clase de color correspondiente', () => {
    render(<BadgeTemperatura value="frio" />);
    expect(screen.getByText('Frío')).toHaveClass('text-temp-frio');
  });

  it('muestra un indicador cuando fue editado manualmente', () => {
    render(<BadgeTemperatura value="moderado" editadoManualmente />);
    expect(screen.getByLabelText('Editado manualmente')).toBeInTheDocument();
  });

  it('no muestra el indicador cuando es categorización automática', () => {
    render(<BadgeTemperatura value="moderado" />);
    expect(screen.queryByLabelText('Editado manualmente')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr test, debe fallar**

Run: `pnpm vitest run apps/web/components/ui/badge-temperatura.test.tsx`
Expected: FAIL — módulo no existe

- [ ] **Step 3: Implementar tipo y componente**

```ts
// apps/web/types/crm.ts
export type Temperatura = 'frio' | 'moderado' | 'caliente';
```

```tsx
// apps/web/components/ui/badge-temperatura.tsx
import { Temperatura } from '@/types/crm';
import { cn } from '@/lib/utils';

const config: Record<Temperatura, { label: string; text: string; bg: string }> = {
  frio: { label: 'Frío', text: 'text-temp-frio', bg: 'bg-temp-frio/10' },
  moderado: { label: 'Moderado', text: 'text-temp-moderado', bg: 'bg-temp-moderado/10' },
  caliente: { label: 'Caliente', text: 'text-temp-caliente', bg: 'bg-temp-caliente/10' },
};

interface BadgeTemperaturaProps {
  value: Temperatura;
  editadoManualmente?: boolean;
}

export function BadgeTemperatura({ value, editadoManualmente }: BadgeTemperaturaProps) {
  const c = config[value];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', c.text, c.bg)}>
      {c.label}
      {editadoManualmente && (
        <svg aria-label="Editado manualmente" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>
      )}
    </span>
  );
}
```

- [ ] **Step 4: Correr test, debe pasar**

Run: `pnpm vitest run apps/web/components/ui/badge-temperatura.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/ui/badge-temperatura.tsx apps/web/types/crm.ts apps/web/components/ui/badge-temperatura.test.tsx
git commit -m "feat: BadgeTemperatura con colores universales + indicador de override manual"
```

---

## Task 5: Migración DB — tabla `negocio` + RLS

**Files:**
- Create: `supabase/migrations/0001_create_negocio.sql`
- Test: `supabase/tests/rls.test.ts` (se va completando en Tasks 5–8)

**Interfaces:**
- Produces: tabla `negocio` con `tenant_id UUID UNIQUE` como llave de aislamiento — todas las demás tablas (Tasks 6–8) referencian este `tenant_id`.

- [ ] **Step 1: Escribir test RLS que espera que la tabla exista y esté aislada por tenant**

```ts
// supabase/tests/rls.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

describe('RLS: negocio', () => {
  let tenantA: string, tenantB: string;

  beforeAll(async () => {
    const { data: a } = await admin.from('negocio').insert({ nombre: 'Barbería A', phone_number_id: 'phone_a' }).select().single();
    const { data: b } = await admin.from('negocio').insert({ nombre: 'Clínica B', phone_number_id: 'phone_b' }).select().single();
    tenantA = a.tenant_id;
    tenantB = b.tenant_id;
  });

  it('un usuario autenticado como tenant A NO puede leer el negocio de tenant B', async () => {
    const clientA = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${await signAs(tenantA)}` } },
    });
    const { data } = await clientA.from('negocio').select('*').eq('tenant_id', tenantB);
    expect(data).toEqual([]);
  });

  it('un usuario autenticado como tenant A SÍ puede leer su propio negocio', async () => {
    const clientA = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${await signAs(tenantA)}` } },
    });
    const { data } = await clientA.from('negocio').select('*').eq('tenant_id', tenantA);
    expect(data).toHaveLength(1);
  });
});

// Helper de test — genera un JWT válido con sub=tenantId para simular auth.uid()
async function signAs(tenantId: string): Promise<string> {
  // Implementación: usa supabase.auth.admin para generar sesión de test, o jwt.sign con el mismo secret que Supabase Auth
  throw new Error('TODO en Step 1 de Task 8: implementar helper de firma de JWT de test');
}
```

- [ ] **Step 2: Correr test, debe fallar (tabla no existe)**

Run: `pnpm vitest run supabase/tests/rls.test.ts`
Expected: FAIL — "relation \"negocio\" does not exist"

- [ ] **Step 3: Escribir la migración**

```sql
-- supabase/migrations/0001_create_negocio.sql
create table negocio (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid unique not null default gen_random_uuid(),
  nombre text not null,
  logo_url text,
  phone_number_id text unique not null,
  access_token text, -- encriptado a nivel de aplicación antes de guardar
  system_prompt text,
  system_prompt_version int not null default 1,
  system_prompt_history jsonb not null default '[]'::jsonb,
  catalogo jsonb not null default '[]'::jsonb,
  horarios jsonb not null default '{}'::jsonb,
  tono_voz text default 'casual',
  tier text not null default 'base' check (tier in ('base', 'pro')),
  color_palette text not null default 'cool' check (color_palette in ('warm', 'cool', 'vibrant')),
  dashboard_view text not null default 'balance' check (dashboard_view in ('balance', 'kpis', 'status')),
  meta_connection_status text not null default 'disconnected' check (meta_connection_status in ('connected', 'disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_negocio_phone_number on negocio(phone_number_id);
create index idx_negocio_tenant on negocio(tenant_id);
```

- [ ] **Step 4: Aplicar la migración**

Run: `supabase db push` (o `psql -f supabase/migrations/0001_create_negocio.sql` contra la instancia local de Supabase)
Expected: "Applying migration 0001_create_negocio.sql... done"

- [ ] **Step 5: Confirmar que la tabla existe (test sigue fallando en RLS, eso es esperado hasta Task 8)**

Run: `pnpm vitest run supabase/tests/rls.test.ts`
Expected: FAIL ahora en `signAs is not implemented` — señal correcta de que la tabla ya existe y el próximo bloqueador es el helper de auth (se resuelve en Task 8).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0001_create_negocio.sql supabase/tests/rls.test.ts
git commit -m "feat(db): tabla negocio con tenant_id, tier, paleta y dashboard_view"
```

---

## Task 6: Migración DB — tabla `productos`

**Files:**
- Create: `supabase/migrations/0002_create_productos.sql`

**Interfaces:**
- Consumes: `negocio.tenant_id` (Task 5)
- Produces: tabla `productos` con `variantes JSONB` (talle, color, precio, stock, updated_at por variante) — consumida por la tool `obtener_catalogo` en Fase 3 y por la página Catálogo en Fase 4.

- [ ] **Step 1: Escribir migración**

```sql
-- supabase/migrations/0002_create_productos.sql
create table productos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  nombre text not null,
  variantes jsonb not null default '[]'::jsonb,
  -- cada elemento de variantes: { "talle": "M", "color": "negro", "precio": 15000, "stock": 8, "activo": true, "updated_at": "..." }
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_productos_tenant on productos(tenant_id);
```

- [ ] **Step 2: Aplicar migración**

Run: `supabase db push`
Expected: "Applying migration 0002_create_productos.sql... done"

- [ ] **Step 3: Test manual de inserción con variantes (smoke test, no unit test — se cubre con RLS en Task 8)**

Run:
```sql
insert into productos (tenant_id, nombre, variantes)
select tenant_id, 'Zapatilla urbana', '[{"talle":"42","color":"negro","precio":45000,"stock":5}]'::jsonb
from negocio limit 1;
select nombre, variantes from productos;
```
Expected: fila insertada, `variantes` devuelve el JSON con talle/color/precio/stock correctos.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_create_productos.sql
git commit -m "feat(db): tabla productos con variantes JSONB (talle/color/precio/stock)"
```

---

## Task 7: Migraciones DB — `conversations`, `messages`, `citas`

**Files:**
- Create: `supabase/migrations/0003_create_conversations_messages.sql`
- Create: `supabase/migrations/0004_create_citas.sql`

**Interfaces:**
- Consumes: `negocio.tenant_id` (Task 5)
- Produces: `conversations.temperatura` y `conversations.temperatura_editada_manualmente` — consumidos directamente por `BadgeTemperatura` (Task 4) en Fase 4; `messages.tool_called` — consumido por el webhook stateless en Fase 3.

- [ ] **Step 1: Escribir migración de conversations + messages**

```sql
-- supabase/migrations/0003_create_conversations_messages.sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  phone_from text not null,
  customer_name text,
  estado text not null default 'activa' check (estado in ('activa', 'cerrada', 'esperando_respuesta')),
  temperatura text not null default 'frio' check (temperatura in ('frio', 'moderado', 'caliente')),
  temperatura_editada_manualmente boolean not null default false,
  temperatura_historial jsonb not null default '[]'::jsonb,
  vendedor_asignado text,
  prioridad text not null default 'normal' check (prioridad in ('normal', 'urgente')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null,
  tool_called text,
  created_at timestamptz not null default now()
);

create index idx_conversations_tenant on conversations(tenant_id);
create index idx_messages_conversation on messages(conversation_id);
create index idx_messages_tenant on messages(tenant_id);
```

- [ ] **Step 2: Aplicar migración**

Run: `supabase db push`
Expected: "Applying migration 0003_create_conversations_messages.sql... done"

- [ ] **Step 3: Escribir migración de citas**

```sql
-- supabase/migrations/0004_create_citas.sql
create table citas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  customer_id text not null,
  customer_name text,
  fecha date not null,
  hora time not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'cancelada', 'completada')),
  created_at timestamptz not null default now()
);

create index idx_citas_tenant on citas(tenant_id);
create index idx_citas_fecha on citas(tenant_id, fecha);
```

- [ ] **Step 4: Aplicar migración**

Run: `supabase db push`
Expected: "Applying migration 0004_create_citas.sql... done"

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_create_conversations_messages.sql supabase/migrations/0004_create_citas.sql
git commit -m "feat(db): tablas conversations, messages y citas con temperatura y aislamiento por tenant"
```

---

## Task 8: RLS policies + tests de aislamiento multi-tenant

**Files:**
- Create: `supabase/migrations/0005_rls_policies.sql`
- Modify: `supabase/tests/rls.test.ts` (implementar `signAs`, agregar tests de las 4 tablas restantes)

**Interfaces:**
- Consumes: todas las tablas de Tasks 5–7
- Produces: garantía de aislamiento probada — bloqueante para FASE 2 (Auth) y FASE 3 (Agente IA), donde un fallo acá sería la fuga de datos crítica identificada en el plan maestro.

- [ ] **Step 1: Escribir la migración de RLS**

```sql
-- supabase/migrations/0005_rls_policies.sql
alter table negocio enable row level security;
alter table productos enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table citas enable row level security;

create policy tenant_isolation_negocio on negocio
  using (tenant_id = auth.uid());

create policy tenant_isolation_productos on productos
  using (tenant_id = auth.uid());

create policy tenant_isolation_conversations on conversations
  using (tenant_id = auth.uid());

create policy tenant_isolation_messages on messages
  using (tenant_id = auth.uid());

create policy tenant_isolation_citas on citas
  using (tenant_id = auth.uid());
```

- [ ] **Step 2: Aplicar migración**

Run: `supabase db push`
Expected: "Applying migration 0005_rls_policies.sql... done"

- [ ] **Step 3: Implementar el helper `signAs` en el archivo de test (reemplaza el `throw` de Task 5)**

```ts
// supabase/tests/rls.test.ts — reemplazar la función signAs completa
import jwt from 'jsonwebtoken';

async function signAs(tenantId: string): Promise<string> {
  // auth.uid() en Supabase = el "sub" claim del JWT. Para tests, el tenant_id
  // ES el user id (negocio.tenant_id se crea igual al futuro auth user id en Fase 2).
  return jwt.sign(
    { sub: tenantId, role: 'authenticated' },
    process.env.SUPABASE_JWT_SECRET!,
    { expiresIn: '1h' }
  );
}
```

- [ ] **Step 4: Correr los 2 tests de Task 5, deben pasar ahora**

Run: `pnpm vitest run supabase/tests/rls.test.ts`
Expected: PASS (2 tests: "no puede leer tenant B", "sí puede leer su propio negocio")

- [ ] **Step 5: Agregar tests de aislamiento para las 4 tablas restantes**

```ts
// supabase/tests/rls.test.ts — agregar al final del describe existente o en describes nuevos

describe('RLS: productos', () => {
  it('tenant A no ve productos de tenant B', async () => {
    const { data: negocioA } = await admin.from('negocio').insert({ nombre: 'A', phone_number_id: 'p_a2' }).select().single();
    const { data: negocioB } = await admin.from('negocio').insert({ nombre: 'B', phone_number_id: 'p_b2' }).select().single();
    await admin.from('productos').insert({ tenant_id: negocioB.tenant_id, nombre: 'Producto B' });

    const clientA = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${await signAs(negocioA.tenant_id)}` } },
    });
    const { data } = await clientA.from('productos').select('*').eq('tenant_id', negocioB.tenant_id);
    expect(data).toEqual([]);
  });
});

describe('RLS: conversations y messages', () => {
  it('tenant A no ve conversations de tenant B', async () => {
    const { data: negocioA } = await admin.from('negocio').insert({ nombre: 'A', phone_number_id: 'p_a3' }).select().single();
    const { data: negocioB } = await admin.from('negocio').insert({ nombre: 'B', phone_number_id: 'p_b3' }).select().single();
    await admin.from('conversations').insert({ tenant_id: negocioB.tenant_id, phone_from: '5491100000000' });

    const clientA = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${await signAs(negocioA.tenant_id)}` } },
    });
    const { data } = await clientA.from('conversations').select('*').eq('tenant_id', negocioB.tenant_id);
    expect(data).toEqual([]);
  });
});

describe('RLS: citas', () => {
  it('tenant A no ve citas de tenant B', async () => {
    const { data: negocioA } = await admin.from('negocio').insert({ nombre: 'A', phone_number_id: 'p_a4' }).select().single();
    const { data: negocioB } = await admin.from('negocio').insert({ nombre: 'B', phone_number_id: 'p_b4' }).select().single();
    await admin.from('citas').insert({ tenant_id: negocioB.tenant_id, customer_id: 'cust1', fecha: '2026-10-01', hora: '10:00' });

    const clientA = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${await signAs(negocioA.tenant_id)}` } },
    });
    const { data } = await clientA.from('citas').select('*').eq('tenant_id', negocioB.tenant_id);
    expect(data).toEqual([]);
  });
});
```

- [ ] **Step 6: Correr toda la suite de RLS, deben pasar los 5 tests**

Run: `pnpm vitest run supabase/tests/rls.test.ts`
Expected: PASS (5 tests) — 0 fugas de datos entre tenants confirmadas

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0005_rls_policies.sql supabase/tests/rls.test.ts
git commit -m "feat(db): RLS policies en las 5 tablas + suite de tests de aislamiento multi-tenant"
```

---

## Task 9: Git remoto + branching strategy

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `README.md` (sección "Branching")
- Modify: `.gitignore`

**Interfaces:**
- Produces: convención de branches (`main` protegida, `feature/*`, `fix/*`) documentada para uso desde FASE 2 en adelante.

- [ ] **Step 1: Verificar/crear `.gitignore` correcto para el monorepo**

```
# .gitignore
node_modules/
.next/
.env
.env.local
dist/
.turbo/
*.log
.DS_Store
```

- [ ] **Step 2: Documentar la estrategia de branching en README**

```markdown
## Branching

- `main`: siempre deployable, protegida (requiere PR + CI verde)
- `feature/<nombre>`: una feature o task del plan por branch
- `fix/<nombre>`: bugfixes

Convención de commits: `feat:`, `fix:`, `chore:`, `docs:` (Conventional Commits).
```

- [ ] **Step 3: Crear el repo remoto y hacer el primer push**

Run:
```bash
gh repo create saas-agente-ia --private --source=. --remote=origin
git push -u origin main
```
Expected: repo visible en GitHub, branch `main` como default.

- [ ] **Step 4: Commit final de la fase**

```bash
git add .gitignore README.md .github/PULL_REQUEST_TEMPLATE.md
git commit -m "chore: gitignore, branching strategy y PR template"
git push
```

---

## Self-Review Checklist (completar al terminar la fase)

**1. Cobertura del spec** — verificar contra `docs/design-system/design-tokens.md` y `plan-maestro-validado.md`:
- [ ] Las 3 paletas están implementadas y probadas (Task 2)
- [ ] Componentes base críticos (Button, BadgeTemperatura) con tests — Card, Input, KPICard, Toggle quedan para Fase 4 con el mismo patrón de Tasks 3–4
- [ ] Las 5 tablas del schema multi-tenant están creadas (Tasks 5–7)
- [ ] RLS probado en las 5 tablas, 0 fugas (Task 8)
- [ ] Repo en GitHub con branching documentado (Task 9)

**2. Placeholder scan** — repasado: no quedan "TODO"/"implementar después" salvo el `signAs` de Task 5, que se resuelve explícitamente en Task 8 Step 3 (no es un placeholder final, es una dependencia secuencial documentada).

**Próxima fase:** FASE 2 (Auth & Supabase) puede arrancar en paralelo a completar Card/Input/KPICard si se prefiere paralelizar con `subagent-driven-development`.
