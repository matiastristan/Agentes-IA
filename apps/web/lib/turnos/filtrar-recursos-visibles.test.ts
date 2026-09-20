import { describe, it, expect } from 'vitest';
import { filtrarRecursosVisibles } from './filtrar-recursos-visibles';

describe('filtrarRecursosVisibles', () => {
  it('incluye un recurso cuyo servicio está activo', () => {
    const visibles = filtrarRecursosVisibles([
      { id: 'r1', nombre: 'Cancha Padel 1', subtipo: 'padel', activo: true, servicio_id: 's1' },
    ]);
    expect(visibles.map((r) => r.id)).toEqual(['r1']);
  });

  it('excluye un recurso huérfano (sin servicio_id) — creado antes de la unificación', () => {
    const visibles = filtrarRecursosVisibles([
      { id: 'r1', nombre: 'Cancha vieja', subtipo: 'padel', activo: true, servicio_id: null },
    ]);
    expect(visibles).toHaveLength(0);
  });

  it('excluye un recurso desactivado aunque tenga servicio', () => {
    const visibles = filtrarRecursosVisibles([
      { id: 'r1', nombre: 'Cancha', subtipo: 'padel', activo: false, servicio_id: 's1' },
    ]);
    expect(visibles).toHaveLength(0);
  });

  it('mantiene el orden original de los recursos visibles', () => {
    const visibles = filtrarRecursosVisibles([
      { id: 'r1', nombre: 'A', subtipo: null, activo: true, servicio_id: 's1' },
      { id: 'r2', nombre: 'B', subtipo: null, activo: true, servicio_id: null },
      { id: 'r3', nombre: 'C', subtipo: null, activo: true, servicio_id: 's3' },
    ]);
    expect(visibles.map((r) => r.id)).toEqual(['r1', 'r3']);
  });

  it('con lista vacía devuelve vacío sin romper', () => {
    expect(filtrarRecursosVisibles([])).toEqual([]);
  });
});
