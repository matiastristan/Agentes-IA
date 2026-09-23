# Recordatorios automáticos — puesta en marcha

Los recordatorios salen **todos los días a las 10:00 (hora Argentina)** y avisan
a quien tenga turno **al día siguiente**, incluidos los clientes mensualizados.

## Por qué hace falta una plantilla aprobada

WhatsApp solo permite mandar texto libre dentro de las **24 horas** posteriores al
último mensaje del cliente. Un recordatorio del día anterior casi siempre cae
fuera de esa ventana, y Meta lo rechaza con el error `131047`.

La única forma de escribirle fuera de la ventana es una **plantilla aprobada**.

El sistema resuelve los dos casos:

| Situación | Qué hace |
|---|---|
| Plantilla configurada | Envía por plantilla (funciona siempre) |
| Sin plantilla, pero el cliente escribió hace menos de 24h | Envía texto libre |
| Sin plantilla y fuera de las 24h | No envía y lo registra con el motivo |

## Paso 1 — Crear la plantilla en Meta

En **WhatsApp Manager → Plantillas de mensajes → Crear plantilla**:

- **Categoría:** Utilidad (no Marketing: las de utilidad se aprueban más rápido
  y son más baratas)
- **Nombre:** `recordatorio_turno`
- **Idioma:** Español (ARG)
- **Cuerpo:**

```
¡Hola {{1}}! Te recordamos tu turno de mañana: {{2}}, {{3}} de {{4}}. ¡Te esperamos!
```

- **Ejemplos para la revisión** (Meta los pide):
  `{{1}}` Josue · `{{2}}` Cancha Padel 2 · `{{3}}` lunes 22/09 · `{{4}}` 19:00 a 21:00

La aprobación suele tardar entre unos minutos y 24 horas.

## Paso 2 — Variables de entorno en Vercel

| Variable | Valor | Obligatoria |
|---|---|---|
| `CRON_SECRET` | Una clave larga al azar | Sí |
| `WHATSAPP_TEMPLATE_RECORDATORIO` | `recordatorio_turno` | No (sin ella solo envía dentro de las 24h) |
| `WHATSAPP_TEMPLATE_RECORDATORIO_IDIOMA` | `es_AR` | No (es el valor por defecto) |

`CRON_SECRET` protege el endpoint: sin ese encabezado, responde 401. Vercel lo
envía solo en sus cron jobs.

## Paso 3 — Activarlo por negocio

En el panel del negocio: **Configuración → Ajustes del agente → Recordatorios
automáticos**. Viene apagado.

Mientras esté apagado, el agente tiene **prohibido** prometerle un recordatorio
al cliente. Al activarlo, puede mencionarlo con naturalidad.

## Disparar un envío a mano

Útil para probar o para recuperar un día que falló:

```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" \
  "https://factor-ia-coral.vercel.app/api/cron/recordatorios?fecha=2026-09-28"
```

Es seguro repetirlo: cada turno tiene un registro con clave única, así que nadie
recibe el mismo recordatorio dos veces.

## Ver qué se envió

```sql
select fecha, telefono, canal, status, error, enviado_at
from recordatorios_enviados
where tenant_id = '<tenant>'
order by enviado_at desc;
```

Los que figuran como `fallido` con canal `ninguno` son los que no se pudieron
enviar por falta de plantilla estando fuera de la ventana de 24 horas.

## Límite del plan de Vercel

En el plan Hobby los cron jobs se ejecutan **una vez por día**, que es
exactamente lo que necesita este diseño. Si en el futuro querés recordatorios
"2 horas antes del turno", hace falta un plan con cron por hora, o disparar el
endpoint desde otro lado (por ejemplo `pg_cron` en Supabase).
