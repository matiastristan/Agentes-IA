alter table negocio add column estado_cuenta text not null default 'activo'
  check (estado_cuenta in ('activo', 'suspendido_pago', 'baja_definitiva'));
