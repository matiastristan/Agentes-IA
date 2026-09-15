-- handle_new_user() solo debe ejecutarse desde el trigger on_auth_user_created,
-- nunca directamente vía RPC pública (/rest/v1/rpc/handle_new_user).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
