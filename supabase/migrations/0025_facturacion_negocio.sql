create table facturacion_negocio (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  concepto text not null,
  monto numeric not null,
  fecha date not null,
  created_at timestamptz not null default now()
);

create index idx_facturacion_negocio_tenant on facturacion_negocio(tenant_id);

alter table facturacion_negocio enable row level security;
-- Deny-by-default, mismo criterio que admins: solo service_role accede.
