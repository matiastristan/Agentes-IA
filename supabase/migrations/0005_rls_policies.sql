alter table negocio enable row level security;
alter table productos enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table citas enable row level security;

-- auth.uid() envuelto en (select ...) para evitar re-evaluación por fila (Supabase perf advisor)
create policy tenant_isolation_negocio on negocio
  using (tenant_id = (select auth.uid()));

create policy tenant_isolation_productos on productos
  using (tenant_id = (select auth.uid()));

create policy tenant_isolation_conversations on conversations
  using (tenant_id = (select auth.uid()));

create policy tenant_isolation_messages on messages
  using (tenant_id = (select auth.uid()));

create policy tenant_isolation_citas on citas
  using (tenant_id = (select auth.uid()));
