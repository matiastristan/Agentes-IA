alter table productos add column rubro text;
alter table consumos_turno add column producto_id uuid references productos(id) on delete set null;
