create table recordatorios_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  minutos_antes int not null,
  mensaje_template text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table recordatorios_config enable row level security;
create policy tenant_isolation_recordatorios_config on recordatorios_config
  using (tenant_id = (select auth.uid()));
