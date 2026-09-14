create table negocio (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid unique not null default gen_random_uuid(),
  nombre text not null,
  logo_url text,
  phone_number_id text unique not null,
  access_token text,
  system_prompt text,
  system_prompt_version int not null default 1,
  system_prompt_history jsonb not null default '[]'::jsonb,
  catalogo jsonb not null default '[]'::jsonb,
  horarios jsonb not null default '{}'::jsonb,
  tono_voz text default 'casual',
  tier text not null default 'base' check (tier in ('base', 'pro')),
  color_palette text not null default 'cool' check (color_palette in ('warm', 'cool', 'vibrant')),
  dashboard_view text not null default 'balance' check (dashboard_view in ('balance', 'kpis', 'status')),
  meta_connection_status text not null default 'disconnected' check (meta_connection_status in ('connected', 'disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_negocio_phone_number on negocio(phone_number_id);
create index idx_negocio_tenant on negocio(tenant_id);
