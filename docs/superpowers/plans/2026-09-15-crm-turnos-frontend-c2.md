# CRM Turnos/Citas — Frontend (C2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la UI del CRM de Turnos: calendario con auto-switch de vista, gestión de servicios/recursos con gating, y configuración de recordatorios/reprogramación.

**Architecture:** Componentes UI siguiendo el design system de Fase 1 (tokens, Card/Badge/Button/Input ya construidos). La lógica de decisión (qué vista mostrar, si se puede crear un recurso) vive en funciones puras testeadas, separadas de los componentes React — mismo patrón que `hasFeature()`.

**Tech Stack:** Next.js 16 (App Router, Server Components donde no hay interactividad), TypeScript, Tailwind 4, Supabase, Vitest + Testing Library.

## Global Constraints

- Cero valores hardcodeados de color/espaciado — todo vía clases Tailwind mapeadas a los tokens de `docs/design-system/design-tokens.md`
- Toda decisión de mostrar/ocultar UI por feature pasa por `hasFeature()` (sub-proyecto A) — nunca un chequeo de tier hardcodeado en un componente
- Toda query a Supabase desde Server Components filtra por el negocio del usuario logueado (RLS ya cubre esto vía `auth.uid()`, pero las páginas asumen sesión — reusar el patrón de `app/dashboard/page.tsx` de Fase 2)
- TDD para toda función pura y componente con lógica de estados; páginas se verifican con smoke test (server levanta, responde 200) igual que Fases 1-3

---

## File Structure

```
apps/web/lib/plans/
  features.ts                   # modificar: agregar 3 FeatureKey nuevos (sin tier default)

apps/web/lib/turnos/
  pick-calendar-view.ts
  pick-calendar-view.test.ts

apps/web/components/turnos/
  turno-card.tsx
  turno-card.test.tsx
  no-show-badge.tsx
  no-show-badge.test.tsx

apps/web/app/turnos/
  page.tsx                      # Calendario principal
  servicios/page.tsx
  recursos/page.tsx
  configuracion/page.tsx
```

---

## Task 1: Feature keys nuevos (sin tier default)

**Files:**
- Modify: `apps/web/lib/plans/features.ts`
- Modify: `apps/web/lib/plans/features.test.ts`

**Interfaces:**
- Consumes: `hasFeature()` ya existente (sub-proyecto A) — no se toca su lógica
- Produces: 3 `FeatureKey` nuevos consumidos por las páginas de recursos (Task 6) y el calendario mobile (Task 7)

- [ ] **Step 1: Escribir los tests**

```ts
// agregar a features.test.ts:
it('multi_recurso, carga_manual_turnos y mobile_vista_scroll_horizontal NO están en ningún tier por default', () => {
  expect(hasFeature('base', [], 'multi_recurso')).toBe(false);
  expect(hasFeature('pro', [], 'multi_recurso')).toBe(false);
  expect(hasFeature('premium', [], 'multi_recurso')).toBe(false);
  expect(hasFeature('premium', [], 'carga_manual_turnos')).toBe(false);
  expect(hasFeature('premium', [], 'mobile_vista_scroll_horizontal')).toBe(false);
});

it('un override habilita multi_recurso para un negocio puntual sin importar el tier', () => {
  const overrides = [{ feature_key: 'multi_recurso', habilitado: true }];
  expect(hasFeature('base', overrides, 'multi_recurso')).toBe(true);
});
```

- [ ] **Step 2: Correr, debe fallar** (TypeScript error — los `FeatureKey` no existen)

Run: `cd apps/web && npx vitest run lib/plans/features.test.ts`

- [ ] **Step 3: Agregar las 3 keys al union type (sin agregarlas a ningún TIER_FEATURES)**

```ts
// en el union type FeatureKey, agregar:
  | 'multi_recurso'
  | 'carga_manual_turnos'
  | 'mobile_vista_scroll_horizontal';
```

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run lib/plans/features.test.ts`
Expected: PASS (11 tests — los 9 anteriores + 2 nuevos)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/plans
git commit -m "feat(plans): 3 features de upsell puntual (multi_recurso, carga_manual_turnos, vista_mobile)"
```

---

## Task 2: pickCalendarView — función pura de decisión de vista

**Files:**
- Create: `apps/web/lib/turnos/pick-calendar-view.ts`
- Create: `apps/web/lib/turnos/pick-calendar-view.test.ts`

**Interfaces:**
- Produces: `pickCalendarView(recursosActivos: number): 'semana' | 'dia'` — consumida por `/turnos` (Task 7)

- [ ] **Step 1: Escribir los tests**

```ts
import { describe, it, expect } from 'vitest';
import { pickCalendarView } from './pick-calendar-view';

describe('pickCalendarView', () => {
  it('0 recursos activos → vista semana', () => {
    expect(pickCalendarView(0)).toBe('semana');
  });

  it('1 recurso activo → vista semana', () => {
    expect(pickCalendarView(1)).toBe('semana');
  });

  it('2 recursos activos → vista día', () => {
    expect(pickCalendarView(2)).toBe('dia');
  });

  it('muchos recursos activos → vista día', () => {
    expect(pickCalendarView(5)).toBe('dia');
  });
});
```

- [ ] **Step 2: Correr, debe fallar**

- [ ] **Step 3: Implementar**

```ts
export function pickCalendarView(recursosActivos: number): 'semana' | 'dia' {
  return recursosActivos >= 2 ? 'dia' : 'semana';
}
```

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run lib/turnos/pick-calendar-view.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/turnos/pick-calendar-view.ts apps/web/lib/turnos/pick-calendar-view.test.ts
git commit -m "feat(turnos): pickCalendarView — auto-switch semana/día según cantidad de recursos"
```

---

## Task 3: Componente TurnoCard

**Files:**
- Create: `apps/web/components/turnos/turno-card.tsx`
- Create: `apps/web/components/turnos/turno-card.test.tsx`

**Interfaces:**
- Consumes: `Card` (Fase 1)
- Produces: `<TurnoCard estado="disponible"|"ocupado"|"no_show"|"reprogramada" ... />` consumido por la página de calendario (Task 7)

- [ ] **Step 1: Escribir los tests**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TurnoCard } from './turno-card';

describe('TurnoCard', () => {
  it('estado disponible: fondo neutro, sin datos de cliente', () => {
    render(<TurnoCard estado="disponible" hora="14:00" />);
    expect(screen.getByText('14:00')).toBeInTheDocument();
    expect(screen.getByText(/disponible/i)).toBeInTheDocument();
  });

  it('estado ocupado muestra el nombre del cliente y usa fondo primary-tint', () => {
    render(<TurnoCard estado="ocupado" hora="15:00" clienteNombre="Juan Pérez" />);
    const card = screen.getByTestId('turno-card');
    expect(card).toHaveClass('bg-primary-tint');
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('estado no_show usa fondo de error y muestra badge', () => {
    render(<TurnoCard estado="no_show" hora="10:00" clienteNombre="Ana" />);
    const card = screen.getByTestId('turno-card');
    expect(card).toHaveClass('bg-error-bg');
    expect(screen.getByText(/no show/i)).toBeInTheDocument();
  });

  it('estado reprogramada usa fondo de warning', () => {
    render(<TurnoCard estado="reprogramada" hora="11:00" clienteNombre="Luis" />);
    expect(screen.getByTestId('turno-card')).toHaveClass('bg-warning-bg');
  });
});
```

- [ ] **Step 2: Correr, debe fallar**

- [ ] **Step 3: Implementar**

```tsx
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type EstadoTurno = 'disponible' | 'ocupado' | 'no_show' | 'reprogramada';

interface TurnoCardProps {
  estado: EstadoTurno;
  hora: string;
  clienteNombre?: string;
}

const estadoConfig: Record<EstadoTurno, { bg: string; label: string }> = {
  disponible: { bg: 'bg-gray-50 border-dashed', label: 'Disponible' },
  ocupado: { bg: 'bg-primary-tint', label: '' },
  no_show: { bg: 'bg-error-bg', label: 'No show' },
  reprogramada: { bg: 'bg-warning-bg', label: 'Reprogramado' },
};

export function TurnoCard({ estado, hora, clienteNombre }: TurnoCardProps) {
  const config = estadoConfig[estado];

  return (
    <Card data-testid="turno-card" className={cn('p-3 flex flex-col gap-1', config.bg)}>
      <span className="text-xs text-text-secondary">{hora}</span>
      {clienteNombre && <span className="text-sm font-medium">{clienteNombre}</span>}
      {config.label && (
        <span className="text-xs font-semibold text-text-secondary">{config.label}</span>
      )}
      {estado === 'disponible' && (
        <span className="text-xs text-text-muted">Disponible</span>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run components/turnos/turno-card.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/turnos/turno-card.tsx apps/web/components/turnos/turno-card.test.tsx
git commit -m "feat(turnos): componente TurnoCard con los 4 estados visuales"
```

---

## Task 4: Componente NoShowBadge

**Files:**
- Create: `apps/web/components/turnos/no-show-badge.tsx`
- Create: `apps/web/components/turnos/no-show-badge.test.tsx`

**Interfaces:**
- Produces: `<NoShowBadge onConfirm={fn} />` — botón de alerta que dispara confirmación de no-show

- [ ] **Step 1: Escribir los tests**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NoShowBadge } from './no-show-badge';

describe('NoShowBadge', () => {
  it('muestra el texto "¿Faltó?"', () => {
    render(<NoShowBadge onConfirm={() => {}} />);
    expect(screen.getByText(/¿Faltó\?/i)).toBeInTheDocument();
  });

  it('dispara onConfirm al hacer click', () => {
    const onConfirm = vi.fn();
    render(<NoShowBadge onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onConfirm).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr, debe fallar**

- [ ] **Step 3: Implementar**

```tsx
interface NoShowBadgeProps {
  onConfirm: () => void;
}

export function NoShowBadge({ onConfirm }: NoShowBadgeProps) {
  return (
    <button
      type="button"
      onClick={onConfirm}
      className="inline-flex items-center gap-1 rounded-full bg-warning-bg text-warning px-2 py-1 text-xs font-semibold"
    >
      ¿Faltó?
    </button>
  );
}
```

- [ ] **Step 4: Correr, debe pasar**

Run: `npx vitest run components/turnos/no-show-badge.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/turnos/no-show-badge.tsx apps/web/components/turnos/no-show-badge.test.tsx
git commit -m "feat(turnos): componente NoShowBadge"
```

---

## Task 5: Página /turnos/servicios (CRUD de servicios)

**Files:**
- Create: `apps/web/app/turnos/servicios/page.tsx`

**Interfaces:**
- Consumes: tabla `servicios` (C1), `Card`/`Input`/`Button` (Fase 1)
- Produces: página donde el dueño crea/edita/desactiva servicios

- [ ] **Step 1: Implementar la página (Server Component para el listado + Client Component para el form)**

```tsx
// app/turnos/servicios/page.tsx
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function ServiciosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: servicios } = await supabase
    .from('servicios')
    .select('*')
    .eq('tenant_id', user!.id)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Servicios</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(servicios ?? []).map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle>{s.nombre}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">{s.duracion_minutos} min · ${s.precio}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
```

Nota: el formulario de "Nuevo Servicio" (Client Component con `Input`/`Button`
y `insert` a Supabase) se implementa en una iteración siguiente — este plan
cubre el listado funcional como base; el form sigue exactamente el patrón ya
usado en `app/signup/page.tsx` (Fase 2).

- [ ] **Step 2: Verificar que la página levanta**

Run: `pnpm dev` (background) + `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/turnos/servicios`
Expected: 307 (redirect a `/login`, porque no hay sesión — es lo correcto, confirma que el `proxy.ts` la está protegiendo)

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/turnos/servicios
git commit -m "feat(turnos): página /turnos/servicios con listado"
```

---

## Task 6: Página /turnos/recursos (CRUD gateado por multi_recurso)

**Files:**
- Create: `apps/web/app/turnos/recursos/page.tsx`

**Interfaces:**
- Consumes: tabla `recursos` (C1), `hasFeature()` (Task 1), tabla `negocio_feature_overrides`
- Produces: página con el guardrail de multi-recurso aplicado

- [ ] **Step 1: Implementar la página con el chequeo de gating**

```tsx
import { createClient } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/plans/features';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RecursosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: negocio } = await supabase
    .from('negocio')
    .select('tier')
    .eq('tenant_id', user!.id)
    .single();

  const { data: overrides } = await supabase
    .from('negocio_feature_overrides')
    .select('feature_key, habilitado')
    .eq('tenant_id', user!.id);

  const { data: recursos } = await supabase
    .from('recursos')
    .select('*')
    .eq('tenant_id', user!.id)
    .eq('activo', true);

  const puedeAgregarMas =
    (recursos?.length ?? 0) === 0 ||
    hasFeature(negocio!.tier as 'base' | 'pro' | 'premium', overrides ?? [], 'multi_recurso');

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Recursos</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {(recursos ?? []).map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle>{r.nombre}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      {!puedeAgregarMas && (
        <p className="text-sm text-warning">
          Ya tenés un recurso cargado. Para agregar más (multi-recurso), contactá a soporte para habilitar el upgrade.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verificar que levanta**

Run: mismo smoke test que Task 5

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/turnos/recursos
git commit -m "feat(turnos): página /turnos/recursos con gate de multi_recurso"
```

---

## Task 7: Página /turnos (calendario principal)

**Files:**
- Create: `apps/web/app/turnos/page.tsx`

**Interfaces:**
- Consumes: `pickCalendarView` (Task 2), `TurnoCard` (Task 3), tabla `citas` + `recursos` (C1)

- [ ] **Step 1: Implementar la página**

```tsx
import { createClient } from '@/lib/supabase/server';
import { pickCalendarView } from '@/lib/turnos/pick-calendar-view';
import { TurnoCard } from '@/components/turnos/turno-card';

export default async function TurnosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: recursos } = await supabase
    .from('recursos')
    .select('*')
    .eq('tenant_id', user!.id)
    .eq('activo', true);

  const vista = pickCalendarView(recursos?.length ?? 0);

  const hoy = new Date().toISOString().slice(0, 10);
  const { data: citas } = await supabase
    .from('citas')
    .select('*')
    .eq('tenant_id', user!.id)
    .eq('fecha', hoy);

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">
        Calendario — vista {vista === 'dia' ? 'Día' : 'Semana'}
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(citas ?? []).map((c) => (
          <TurnoCard
            key={c.id}
            estado={c.estado as 'disponible' | 'ocupado' | 'no_show' | 'reprogramada'}
            hora={c.hora}
            clienteNombre={c.customer_name ?? undefined}
          />
        ))}
      </div>
    </main>
  );
}
```

Nota: esta es la base funcional (lista las citas del día con `TurnoCard`). El
layout de grilla real con columnas por recurso, el carrusel swipe mobile, y el
modal de "Nuevo turno" (gateado por `carga_manual_turnos`) son iteraciones
visuales sobre esta base — se construyen en una siguiente pasada una vez que
esta estructura de datos esté funcionando end-to-end.

- [ ] **Step 2: Verificar que levanta**

Run: mismo smoke test

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/turnos/page.tsx
git commit -m "feat(turnos): página /turnos con calendario base (vista auto-switch)"
```

---

## Task 8: Página /turnos/configuracion (recordatorios + reprogramación)

**Files:**
- Create: `apps/web/app/turnos/configuracion/page.tsx`

**Interfaces:**
- Consumes: `checkReminderGuardrail` (C1), tabla `recordatorios_config`, `reglas_reprogramacion`

- [ ] **Step 1: Implementar la página**

```tsx
import { createClient } from '@/lib/supabase/server';
import { checkReminderGuardrail } from '@/lib/turnos/reminder-guardrail';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function ConfiguracionTurnosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: negocio } = await supabase
    .from('negocio')
    .select('plantillas_meta_habilitadas')
    .eq('tenant_id', user!.id)
    .single();

  const { data: reglas } = await supabase
    .from('recordatorios_config')
    .select('*')
    .eq('tenant_id', user!.id);

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Recordatorios</h1>
      <div className="flex flex-col gap-3">
        {(reglas ?? []).map((r) => {
          const guardrail = checkReminderGuardrail(
            r.minutos_antes,
            negocio!.plantillas_meta_habilitadas
          );
          return (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle>{r.minutos_antes} minutos antes</CardTitle>
              </CardHeader>
              <CardContent>
                {guardrail.requiereAlerta && (
                  <p className="text-sm text-warning">⚠️ {guardrail.motivo}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verificar que levanta**

Run: mismo smoke test

- [ ] **Step 3: `tsc --noEmit` limpio + suite completa**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errores, todos los tests en verde

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/turnos/configuracion
git commit -m "feat(turnos): página /turnos/configuracion con guardrail de recordatorios visible"
```

---

## Task 9: Regenerar tipos TypeScript

**Files:**
- Modify: `apps/web/lib/supabase/types_db.ts`

- [ ] **Step 1: Generar vía `mcp__Supabase__generate_typescript_types`** (por si hubo cambios de schema que no se reflejaron — en este plan no se agregaron columnas nuevas, así que este paso es de verificación, no debería cambiar nada)

- [ ] **Step 2: `tsc --noEmit` limpio + suite completa del monorepo**

- [ ] **Step 3: Commit si hubo cambios** (si no hubo diferencias, se salta este commit)

---

## Self-Review Checklist

**1. Cobertura del spec** — verificar contra `docs/superpowers/specs/2026-09-15-crm-turnos-frontend-c2-design.md`:
- [ ] 3 features nuevas sin tier default (Task 1)
- [ ] `pickCalendarView` testeado (Task 2)
- [ ] `TurnoCard` con los 4 estados visuales (Task 3)
- [ ] `NoShowBadge` (Task 4)
- [ ] 4 páginas nuevas funcionales (Tasks 5-8)

**2. Explícitamente diferido a una siguiente iteración** (no son placeholders rotos,
son decisiones conscientes de scope documentadas en cada task): el layout de
grilla visual completo con columnas por recurso, el carrusel swipe mobile, el
modal de "Nuevo turno", y los formularios de alta de servicios/recursos. La
base de datos y la lógica de decisión (qué vista, qué gate) ya están completas
y testeadas — lo que falta es la capa de interacción visual más rica sobre esa
base, que conviene iterar mirando cómo se ve en uso real.

**Próximo:** sub-proyecto B (CRM Ventas) o iterar sobre la capa visual de C2.
