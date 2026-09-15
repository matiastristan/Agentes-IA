alter table productos add column precio numeric;
alter table productos add column stock int not null default 0;
alter table productos add column atributos jsonb not null default '{}'::jsonb;
alter table productos add column umbral_alerta_stock int;
