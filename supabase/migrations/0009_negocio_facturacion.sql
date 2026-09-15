alter table negocio add column plan_ciclo_facturacion text not null default 'mensual'
  check (plan_ciclo_facturacion in ('mensual', 'anual'));
alter table negocio add column plan_fecha_alta date;
alter table negocio add column plan_fecha_vencimiento date;
alter table negocio add column plan_estado_pago text not null default 'al_dia'
  check (plan_estado_pago in ('al_dia', 'vencido', 'pendiente'));
