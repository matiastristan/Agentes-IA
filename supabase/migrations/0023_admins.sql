create table admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;
-- Sin policies para anon/authenticated: deny by default. Solo el service_role
-- (que bypasea RLS) puede leer/escribir esta tabla — nunca se expone vía la
-- API pública de Supabase a usuarios normales. El advisor marca esto como
-- INFO "rls_enabled_no_policy" — es intencional, no un error a corregir.
