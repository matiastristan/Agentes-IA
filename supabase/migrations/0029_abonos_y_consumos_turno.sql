create table abonos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  recurso_id uuid not null references recursos(id) on delete cascade,
  cliente_nombre text not null,
  dia_semana int not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fin time not null,
  precio numeric not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_abonos_tenant on abonos(tenant_id);
alter table abonos enable row level security;
create policy "abonos_tenant_isolation" on abonos
  for all using (tenant_id = (select auth.uid())) with check (tenant_id = (select auth.uid()));

create table consumos_turno (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  cita_id uuid references citas(id) on delete cascade,
  abono_id uuid references abonos(id) on delete cascade,
  fecha date not null,
  descripcion text not null,
  precio numeric not null,
  created_at timestamptz not null default now(),
  check (cita_id is not null or abono_id is not null)
);
create index idx_consumos_turno_tenant on consumos_turno(tenant_id);
create index idx_consumos_turno_cita on consumos_turno(cita_id);
create index idx_consumos_turno_abono on consumos_turno(abono_id, fecha);
alter table consumos_turno enable row level security;
create policy "consumos_turno_tenant_isolation" on consumos_turno
  for all using (tenant_id = (select auth.uid())) with check (tenant_id = (select auth.uid()));
