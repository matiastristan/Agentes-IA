create table negocio_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  feature_key text not null,
  habilitado boolean not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, feature_key)
);

alter table negocio_feature_overrides enable row level security;
create policy tenant_isolation_negocio_feature_overrides on negocio_feature_overrides
  using (tenant_id = (select auth.uid()));
