create table lista_espera (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  phone text not null,
  servicio_id uuid references servicios(id),
  recurso_id uuid references recursos(id),
  franja_horaria_deseada jsonb not null,
  estado text not null default 'esperando' check (estado in ('esperando', 'notificado', 'confirmado', 'vencido')),
  created_at timestamptz not null default now()
);

create index idx_lista_espera_tenant on lista_espera(tenant_id);
create index idx_lista_espera_estado on lista_espera(tenant_id, estado);

alter table lista_espera enable row level security;
create policy tenant_isolation_lista_espera on lista_espera
  using (tenant_id = (select auth.uid()));
