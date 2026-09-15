create table clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  phone text not null,
  nombre text,
  fecha_nacimiento date,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, phone)
);

create index idx_clientes_tenant_phone on clientes(tenant_id, phone);

alter table clientes enable row level security;
create policy tenant_isolation_clientes on clientes
  using (tenant_id = (select auth.uid()));
