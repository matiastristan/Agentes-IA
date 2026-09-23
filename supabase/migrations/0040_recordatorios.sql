alter table negocio add column if not exists recordatorios_activos boolean not null default false;

create table if not exists recordatorios_enviados (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  cita_id uuid references citas(id) on delete cascade,
  abono_id uuid references abonos(id) on delete cascade,
  fecha date not null,
  telefono text not null,
  canal text not null,
  status text not null,
  error text,
  enviado_at timestamptz not null default now(),
  constraint recordatorio_referencia_valida check (
    (cita_id is not null and abono_id is null) or (cita_id is null and abono_id is not null)
  )
);

create unique index if not exists recordatorios_cita_unico
  on recordatorios_enviados(cita_id) where cita_id is not null;
create unique index if not exists recordatorios_abono_unico
  on recordatorios_enviados(abono_id, fecha) where abono_id is not null;
create index if not exists recordatorios_tenant_fecha_idx on recordatorios_enviados(tenant_id, fecha);

alter table recordatorios_enviados enable row level security;
create policy tenant_isolation_recordatorios on recordatorios_enviados
  for all using (tenant_id = (select auth.uid()));
