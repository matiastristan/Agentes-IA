interface Recurso {
  id: string;
  subtipo: string | null;
}

interface CitaExistente {
  recurso_id: string | null;
  hora: string;
}

interface FindRecursoDisponibleInput {
  recursos: Recurso[];
  subtipo: string | null;
  hora: string;
  citasExistentes: CitaExistente[];
}

export function findRecursoDisponible({
  recursos,
  subtipo,
  hora,
  citasExistentes,
}: FindRecursoDisponibleInput): string | null {
  const candidatos = subtipo ? recursos.filter((r) => r.subtipo === subtipo) : recursos;

  const ocupadosAEsaHora = new Set(
    citasExistentes.filter((c) => c.hora.slice(0, 5) === hora.slice(0, 5)).map((c) => c.recurso_id)
  );

  const libre = candidatos.find((r) => !ocupadosAEsaHora.has(r.id));
  return libre?.id ?? null;
}
