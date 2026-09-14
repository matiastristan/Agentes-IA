create table conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  phone_from text not null,
  customer_name text,
  estado text not null default 'activa' check (estado in ('activa', 'cerrada', 'esperando_respuesta')),
  temperatura text not null default 'frio' check (temperatura in ('frio', 'moderado', 'caliente')),
  temperatura_editada_manualmente boolean not null default false,
  temperatura_historial jsonb not null default '[]'::jsonb,
  vendedor_asignado text,
  prioridad text not null default 'normal' check (prioridad in ('normal', 'urgente')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null,
  tool_called text,
  created_at timestamptz not null default now()
);

create index idx_conversations_tenant on conversations(tenant_id);
create index idx_messages_conversation on messages(conversation_id);
create index idx_messages_tenant on messages(tenant_id);
