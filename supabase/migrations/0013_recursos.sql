create table recursos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  nombre text not null,
  subtipo text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_recursos_tenant on recursos(tenant_id);

alter table recursos enable row level security;
create policy tenant_isolation_recursos on recursos
  using (tenant_id = (select auth.uid()));
