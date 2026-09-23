-- Garantía física contra doble reserva: una misma cancha no puede tener dos
-- turnos activos a la misma fecha y hora. Los cancelados no cuentan.
create unique index if not exists citas_unica_por_cancha_fecha_hora
  on citas(recurso_id, fecha, hora)
  where recurso_id is not null and estado <> 'cancelada';
