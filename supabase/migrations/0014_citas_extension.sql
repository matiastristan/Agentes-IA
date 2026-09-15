alter table citas add column servicio_id uuid references servicios(id);
alter table citas add column recurso_id uuid references recursos(id);
alter table citas add column sena_requerida boolean not null default false;
alter table citas add column sena_pagada boolean not null default false;
alter table citas add column sena_metodo text check (sena_metodo in ('manual', 'mercadopago'));

alter table citas drop constraint citas_estado_check;
alter table citas add constraint citas_estado_check
  check (estado in ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_show', 'reprogramada'));
