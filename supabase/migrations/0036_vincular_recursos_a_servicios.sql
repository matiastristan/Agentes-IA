alter table recursos add column servicio_id uuid references servicios(id) on delete cascade;
create index if not exists recursos_servicio_id_idx on recursos(servicio_id);
