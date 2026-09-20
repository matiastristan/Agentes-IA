interface RecursoConServicio {
  id: string;
  nombre: string;
  subtipo: string | null;
  activo: boolean;
  servicio_id: string | null;
}

/**
 * Un recurso (cancha/espacio) solo se muestra en el calendario y el dashboard si:
 *  - está activo, y
 *  - está vinculado a un servicio (servicio_id no nulo).
 *
 * El segundo filtro es la clave: desde que Servicios y canchas están unificados,
 * cada servicio crea su recurso espejo. Un recurso sin servicio_id es huérfano
 * (quedó de antes de la unificación) y no debe aparecer en ningún lado, porque
 * el usuario no tiene forma de gestionarlo desde la UI.
 *
 * Las consultas ya filtran por servicio activo en la query (join), así que acá
 * solo validamos lo que llega.
 */
export function filtrarRecursosVisibles<T extends RecursoConServicio>(recursos: T[]): T[] {
  return recursos.filter((r) => r.activo && r.servicio_id !== null);
}
