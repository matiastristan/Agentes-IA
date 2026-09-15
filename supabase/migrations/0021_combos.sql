create table combos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  nombre text not null,
  productos_incluidos jsonb not null,
  precio numeric not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_combos_tenant on combos(tenant_id);

alter table combos enable row level security;
create policy tenant_isolation_combos on combos
  using (tenant_id = (select auth.uid()));
