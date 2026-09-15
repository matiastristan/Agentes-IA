# CRM Turnos/Citas — Frontend (Sub-proyecto C2)

**Fecha**: 2026-09-15
**Estado**: Aprobado por el usuario, listo para `writing-plans`
**Depende de**: Sub-proyecto A (feature-gating, `hasFeature()`), Sub-proyecto C1 (schema de turnos, `findNextWaitlistCandidate`, `checkReminderGuardrail`)

## Contexto

C1 dejó el backend completo (schema, tools del agente, lógica de lista de espera
y guardrail de recordatorios). C2 es la UI que el dueño del negocio usa día a día:
el calendario, la gestión de servicios/recursos, y la configuración de
recordatorios/reprogramación.

## Alcance

### 1. Vistas de calendario — auto-switch por cantidad de recursos

- **1 recurso activo** (o ninguno cargado todavía): Vista **Semana**, columnas por
  día, sin separar por recurso — más simple, alcanza para un negocio con un solo
  profesional/cancha/sillón.
- **2+ recursos activos**: Vista **Día**, columnas por recurso — necesaria para
  ver disponibilidad en paralelo (3 canchas, 2 sillones, etc.).
- El switch es automático según `count(recursos where activo = true)` para ese
  `tenant_id` — no requiere configuración manual del dueño.

### 2. Gate de multi-recurso (nuevo `FeatureKey`, vía `negocio_feature_overrides`)

Agregar un feature `'multi_recurso'` al union type `FeatureKey` (no se agrega a
ningún `TIER_FEATURES` — queda deshabilitado por default para todos los tiers,
solo se activa por negocio vía override, igual que se diseñó en el sub-proyecto A).

- Si el negocio tiene 0-1 recursos y el dueño intenta crear un 2do recurso desde
  `/turnos/recursos`, y `hasFeature(tier, overrides, 'multi_recurso') === false`:
  se bloquea la creación y se muestra un modal ("Necesitás el upgrade de
  multi-recurso — contactar soporte"), mismo patrón UX que el guardrail de
  plantillas de Meta (C1).
- Si el override está habilitado, la creación procede sin fricción.

### 3. Gate de carga manual de turnos (nuevo `FeatureKey`)

Agregar `'carga_manual_turnos'` al union type `FeatureKey`, tampoco incluido en
ningún tier por default.

- Sin el override: el botón "Nuevo turno" y el click-to-create en huecos vacíos
  de la grilla **no se renderizan** (a diferencia de multi-recurso, acá no hay
  modal de upsell — la funcionalidad simplemente no está visible, porque no es
  una acción que el dueño inicia activamente buscando algo que falta).
- Con el override habilitado: aparece el botón "Nuevo turno" (abre un modal con
  selects de fecha/hora/servicio/recurso) y el click directo en un hueco vacío
  de la grilla abre el mismo modal pre-completado con esa fecha/hora/recurso.

### 4. Feature de vista mobile (nuevo `FeatureKey`)

Agregar `'mobile_vista_scroll_horizontal'` al union type `FeatureKey`, no
incluido en ningún tier por default (`false` = carrusel swipe).

- **Default (override deshabilitado)**: carrusel — un recurso a pantalla
  completa, swipe horizontal para cambiar de recurso, tabs/puntitos de
  navegación arriba indicando cuál se está viendo.
- **Override habilitado**: grilla con scroll horizontal literal, todas las
  columnas de recursos visibles arrastrando con el dedo.
- Ambos modos ya quedan construidos — el toggle es solo para que la plataforma
  pruebe cuál se adapta mejor a cada negocio y lo ofrezca como mejora vendible.

### 5. Páginas nuevas

```
/turnos                    Calendario principal (Semana o Día según cantidad de recursos)
/turnos/servicios           CRUD de servicios
/turnos/recursos             CRUD de recursos (gateado por multi_recurso al crear el 2do+)
/turnos/configuracion         Reglas de recordatorios (con ícono de alerta del guardrail de C1)
                               + reglas de reprogramación
```

Todas siguen el layout base ya definido en Fase 1 (sidebar + header + contenido),
y se agregan como ítems nuevos del sidebar bajo una sección "Turnos" (visible
solo para negocios con `tipo_crm = 'turnos'`).

### 6. Tarjeta de turno — estados visuales

Reusa tokens ya definidos en `docs/design-system/design-tokens.md` (Fase 1),
sin crear paleta nueva:

| Estado | Estilo |
|---|---|
| Disponible (hueco vacío) | fondo neutro (`--gray-50`), borde punteado |
| Ocupado / confirmado | `--color-primary-tint`, borde `--color-primary` |
| No-show | `--color-error-bg`, badge con ícono |
| Reprogramado | `--color-warning-bg`, badge con ícono |

### 7. Flujo de no-show en la UI

A los N minutos de pasada la hora del turno sin marcar asistencia, la tarjeta
muestra un badge "¿Faltó?" (usa `--color-warning`). Click del dueño → confirma
en un modal simple → PATCH del turno a `estado = 'no_show'` → el backend (C1)
ya se encarga de liberar el recurso y buscar en `lista_espera` vía
`findNextWaitlistCandidate`.

### 8. Responsive — breakpoints

Sigue los breakpoints ya definidos en Fase 1 (`docs/design-system/design-tokens.md`
sección 6): `< 768px` mobile (carrusel o scroll horizontal según el 4), `768-1024px`
tablet (grilla completa pero compacta), `> 1024px` desktop (grilla completa).

## Explícitamente fuera de alcance de C2

- El CRM de Ventas → sub-proyecto B
- El panel admin donde se activan los overrides (`multi_recurso`,
  `carga_manual_turnos`, `mobile_vista_scroll_horizontal`, y el ya existente
  `plantillas_meta_habilitadas`) → sub-proyecto D
- Drag-and-drop para mover turnos arrastrando en la grilla → backlog, no es
  parte del MVP de C2 (la reprogramación ya tiene su propio flujo vía el agente
  o un modal de edición, no hace falta drag-and-drop para el lanzamiento)

## Testing

- Función pura `pickCalendarView(recursosActivos: number): 'semana' | 'dia'` —
  testeada de forma aislada (1 recurso o menos → semana, 2+ → día).
- `hasFeature()` ya soporta los 3 `FeatureKey` nuevos sin cambios de lógica —
  solo se agregan tests confirmando que ninguno está en ningún `TIER_FEATURES`
  por default y que un override los habilita.
- Componentes de UI (tarjeta de turno, badge de no-show) siguen el mismo
  patrón TDD de Fase 1 (test de clases/estados, luego implementación).
- Verificación manual de que el server levanta y las páginas nuevas responden
  200 (mismo patrón usado en Fases 1-3).
