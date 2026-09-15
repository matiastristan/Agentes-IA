create table ventas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references negocio(tenant_id) on delete cascade,
  customer_id text,
  customer_name text,
  total numeric not null default 0,
  estado text not null default 'confirmada' check (estado in ('confirmada', 'cancelada')),
  created_at timestamptz not null default now()
);

create table venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas(id) on delete cascade,
  producto_id uuid references productos(id),
  combo_id uuid references combos(id),
  cantidad int not null,
  precio_unitario numeric not null,
  es_combo boolean not null default false
);

create index idx_ventas_tenant on ventas(tenant_id);
create index idx_venta_items_venta on venta_items(venta_id);

alter table ventas enable row level security;
create policy tenant_isolation_ventas on ventas
  using (tenant_id = (select auth.uid()));

alter table venta_items enable row level security;
create policy tenant_isolation_venta_items on venta_items
  using (
    exists (
      select 1 from ventas
      where ventas.id = venta_items.venta_id
      and ventas.tenant_id = (select auth.uid())
    )
  );
