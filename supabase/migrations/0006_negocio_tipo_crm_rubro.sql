alter table negocio add column tipo_crm text not null default 'turnos'
  check (tipo_crm in ('ventas', 'turnos'));
alter table negocio add column rubro text;
