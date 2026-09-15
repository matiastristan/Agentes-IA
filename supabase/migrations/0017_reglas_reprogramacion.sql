create table reglas_reprogramacion (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  horas_minimas_anticipacion int not null default 24,
  permite_sin_perder_sena boolean not null default true,
  created_at timestamptz not null default now()
);

alter table reglas_reprogramacion enable row level security;
create policy tenant_isolation_reglas_reprogramacion on reglas_reprogramacion
  using (tenant_id = (select auth.uid()));
