create table servicios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  nombre text not null,
  duracion_minutos int not null,
  precio numeric not null,
  promociones jsonb not null default '[]'::jsonb,
  horario_override jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_servicios_tenant on servicios(tenant_id);

alter table servicios enable row level security;
create policy tenant_isolation_servicios on servicios
  using (tenant_id = (select auth.uid()));
