-- Reprograma un turno de forma atómica: cancela las filas viejas e inserta las
-- nuevas en UNA transacción. Si el insert falla (índice único: otro cliente tomó
-- el horario), se deshace también la cancelación y el turno original queda intacto.
-- SECURITY INVOKER: respeta RLS; el webhook usa service role y filtra por tenant.
create or replace function public.reprogramar_turno(
  p_tenant_id uuid,
  p_ids_viejos uuid[],
  p_filas_nuevas jsonb
)
returns setof citas
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_canceladas int;
begin
  if coalesce(array_length(p_ids_viejos, 1), 0) = 0 then
    raise exception 'turno_no_encontrado';
  end if;

  update citas
     set estado = 'cancelada'
   where id = any(p_ids_viejos)
     and tenant_id = p_tenant_id
     and estado <> 'cancelada';

  get diagnostics v_canceladas = row_count;
  if v_canceladas <> array_length(p_ids_viejos, 1) then
    raise exception 'turno_no_encontrado';
  end if;

  return query
  insert into citas (tenant_id, customer_id, customer_name, fecha, hora, servicio_id, recurso_id)
  select p_tenant_id, x.customer_id, x.customer_name, x.fecha, x.hora, x.servicio_id, x.recurso_id
    from jsonb_to_recordset(p_filas_nuevas)
      as x(customer_id text, customer_name text, fecha date, hora time, servicio_id uuid, recurso_id uuid)
  returning *;
end;
$$;

revoke all on function public.reprogramar_turno(uuid, uuid[], jsonb) from public, anon;
grant execute on function public.reprogramar_turno(uuid, uuid[], jsonb) to authenticated, service_role;
