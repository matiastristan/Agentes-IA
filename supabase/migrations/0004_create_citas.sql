create table citas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  customer_id text not null,
  customer_name text,
  fecha date not null,
  hora time not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'cancelada', 'completada')),
  created_at timestamptz not null default now()
);

create index idx_citas_tenant on citas(tenant_id);
create index idx_citas_fecha on citas(tenant_id, fecha);
