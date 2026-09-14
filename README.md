# SaaS Agente IA Multi-Tenant

SaaS multi-tenant con Agente IA que responde WhatsApp 24/7, registra citas y gestiona catálogo para pequeños negocios (barberías, clínicas, calzado, pet shop, etc.).

## Estado actual (FASE 1 en progreso)

✅ Monorepo pnpm + Next.js 16 + Tailwind 4
✅ Design tokens de 3 capas (primitive → semantic → component), 3 paletas dinámicas
✅ Componentes base: `Button`, `BadgeTemperatura` (con tests, TDD)
✅ Schema multi-tenant ya aplicado en Supabase (proyecto **AgentesIA**, `afleydeeytyfgpytlimm`):
   - Tablas: `negocio`, `productos`, `conversations`, `messages`, `citas`
   - RLS habilitado + policy `tenant_id = (select auth.uid())` en las 5 (optimizada, sin warnings del linter de Supabase)
⏳ Pendiente: Card, Input, KPICard, Toggle (mismo patrón TDD que Button/BadgeTemperatura) — quedan para Fase 4 o antes si se prioriza
⏳ Pendiente: push a GitHub (repo `matiastristan/Agentes-IA`)

Ver el plan completo en `docs/superpowers/plans/2026-09-14-fase1-architecture-design-system.md`
y el design system completo en `docs/design-system/design-tokens.md`.

## Setup local

```bash
# Requisitos: Node >= 20, pnpm >= 9
pnpm approve-builds --all   # aprueba esbuild/unrs-resolver/sharp (primera vez)
pnpm install
pnpm dev                    # levanta apps/web en localhost:3000
pnpm test                   # corre toda la suite de tests (vitest)
```

Regenerar el CSS de tokens si se edita `packages/design-tokens/design-tokens.json`:

```bash
cd packages/design-tokens && npx tsx generate-css.ts
```

## Conectar este código a GitHub (matiastristan/Agentes-IA)

Este repo ya tiene 6 commits locales con historial completo (scaffold → tokens →
componentes → schema DB). Para subirlo:

```bash
# 1. Descomprimir el zip y entrar a la carpeta
cd saas-agente-ia

# 2. Verificar que el repo remoto existe y está vacío (o forzar si ya tiene un README inicial)
git remote add origin https://github.com/matiastristan/Agentes-IA.git

# 3a. Si el repo remoto está VACÍO:
git branch -M main
git push -u origin main

# 3b. Si el repo remoto YA tiene contenido (ej. README inicial de GitHub):
git pull origin main --allow-unrelated-histories
# resolver conflictos si los hay, luego:
git push -u origin main
```

Después de esto, cualquier branch nuevo sigue la convención documentada abajo.

## Branching

- `main`: siempre deployable, protegida (requiere PR + CI verde cuando se configure Fase 7)
- `feature/<nombre>`: una feature o task del plan por branch
- `fix/<nombre>`: bugfixes

Convención de commits: `feat:`, `fix:`, `chore:`, `docs:` (Conventional Commits).

## Supabase

Proyecto: **AgentesIA** — `https://supabase.com/dashboard/project/afleydeeytyfgpytlimm`

Las migraciones en `supabase/migrations/` ya están aplicadas en producción vía
Supabase MCP. Si necesitás recrear el schema en otro proyecto (ej. staging),
aplicalas en orden con el CLI de Supabase:

```bash
supabase link --project-ref <tu-project-ref>
supabase db push
```

## Stack

Next.js 16 · React 19 · Tailwind 4 · TypeScript · Supabase (Postgres + Auth + RLS) · Vitest · pnpm workspaces
