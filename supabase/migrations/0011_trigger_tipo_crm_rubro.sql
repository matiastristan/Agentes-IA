create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.negocio (tenant_id, nombre, phone_number_id, meta_connection_status, tipo_crm, rubro)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre_negocio', split_part(new.email, '@', 1)),
    'pending_' || new.id::text,
    'disconnected',
    coalesce(new.raw_user_meta_data->>'tipo_crm', 'turnos'),
    new.raw_user_meta_data->>'rubro'
  );
  return new;
end;
$$;
