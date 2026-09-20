# Runbook — Entrega de ZIP y deploy

## Regla del lockfile (importante)

**El ZIP NUNCA incluye `pnpm-lock.yaml`.**

### Por qué

El entorno donde se arma el ZIP no tiene acceso de red completo al registry de
npm, así que no puede correr `pnpm install` para regenerar el lockfile cuando se
agrega una dependencia nueva. Su copia del lockfile queda desactualizada.

Si esa copia desactualizada viaja en el ZIP, al extraer pisa el lockfile correcto
de la máquina local, y Vercel falla en el build con:

```
ERR_PNPM_OUTDATED_LOCKFILE
Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date
```

Vercel corre `pnpm install --frozen-lockfile` a propósito (buena práctica de CI:
el build no debe poder cambiar dependencias por su cuenta), así que un lockfile
desincronizado siempre rompe el deploy.

### Cómo se excluye

El comando de empaquetado incluye:

```bash
zip -rq saas-agente-ia.zip . \
  -x ".git/*" ".git" \
  -x "node_modules/*" "*/node_modules/*" \
  -x ".next/*" "*/.next/*" \
  -x "pnpm-lock.yaml" \
  -x "*.log" \
  -x "apps/web/.env.local" \
  -x "apps/web/certificates/*"
```

De esta forma el lockfile de la máquina local, que siempre está correcto, nunca
se sobreescribe.

## Cuándo hay que correr `pnpm install`

Solo cuando se agregó o cambió una dependencia en algún `package.json`. En ese
caso, la entrega tiene que decirlo **explícitamente**, y el orden es:

```powershell
# 1. Extraer el ZIP (reemplazando todo)
# 2. Regenerar el lockfile con la dependencia nueva
pnpm install
# 3. Commitear y pushear
git add -A
git commit -m "..."
git push origin main
```

Si no se tocaron dependencias, se extrae el ZIP y se commitea directo.

## Checklist antes de entregar un ZIP

1. `npx tsc --noEmit` sin errores
2. `npx vitest run` — toda la suite en verde (apps/web y packages/design-tokens)
3. `next build` de producción exitoso
4. Revisar `git diff` de los `package.json` para saber si cambiaron dependencias
5. Empaquetar **sin** `pnpm-lock.yaml`
6. En el mensaje de entrega, decir si hace falta `pnpm install` o no

## Migraciones de base de datos

Cuando una ronda incluye cambios de schema:

- Aplicar la migración en Supabase
- Guardar el `.sql` en `supabase/migrations/` con el número siguiente
- Mencionarlo en la entrega, junto con cualquier backfill que se haya corrido
