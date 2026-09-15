create index if not exists idx_venta_items_producto on venta_items(producto_id);
create index if not exists idx_venta_items_combo on venta_items(combo_id);
create index if not exists idx_citas_recurso on citas(recurso_id);
create index if not exists idx_citas_servicio on citas(servicio_id);
create index if not exists idx_lista_espera_recurso on lista_espera(recurso_id);
create index if not exists idx_lista_espera_servicio on lista_espera(servicio_id);
create index if not exists idx_recordatorios_config_tenant on recordatorios_config(tenant_id);
create index if not exists idx_reglas_reprogramacion_tenant on reglas_reprogramacion(tenant_id);
