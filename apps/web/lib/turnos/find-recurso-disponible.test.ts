import { describe, it, expect } from 'vitest';
import { findRecursoDisponible } from './find-recurso-disponible';

const RECURSOS = [
  { id: 'r1', subtipo: 'futbol_5' },
  { id: 'r2', subtipo: 'futbol_5' },
  { id: 'r3', subtipo: 'futbol_7' },
];

describe('findRecursoDisponible', () => {
  it('devuelve el primer recurso del subtipo pedido si ninguno está ocupado', () => {
    const resultado = findRecursoDisponible({
      recursos: RECURSOS,
      subtipo: 'futbol_5',
      hora: '18:00',
      citasExistentes: [],
    });
    expect(resultado).toBe('r1');
  });

  it('salta al siguiente recurso si el primero ya está ocupado a esa hora', () => {
    const resultado = findRecursoDisponible({
      recursos: RECURSOS,
      subtipo: 'futbol_5',
      hora: '18:00',
      citasExistentes: [{ recurso_id: 'r1', hora: '18:00' }],
    });
    expect(resultado).toBe('r2');
  });

  it('devuelve null si todas las canchas de ese subtipo están ocupadas a esa hora', () => {
    const resultado = findRecursoDisponible({
      recursos: RECURSOS,
      subtipo: 'futbol_5',
      hora: '18:00',
      citasExistentes: [
        { recurso_id: 'r1', hora: '18:00' },
        { recurso_id: 'r2', hora: '18:00' },
      ],
    });
    expect(resultado).toBeNull();
  });

  it('un recurso ocupado a OTRA hora no cuenta como ocupado para esta hora', () => {
    const resultado = findRecursoDisponible({
      recursos: RECURSOS,
      subtipo: 'futbol_5',
      hora: '18:00',
      citasExistentes: [{ recurso_id: 'r1', hora: '19:00' }],
    });
    expect(resultado).toBe('r1');
  });

  it('sin subtipo (servicio sin cancha específica asociada), usa cualquier recurso libre', () => {
    const resultado = findRecursoDisponible({
      recursos: RECURSOS,
      subtipo: null,
      hora: '18:00',
      citasExistentes: [{ recurso_id: 'r1', hora: '18:00' }],
    });
    expect(resultado).toBe('r2');
  });

  it('devuelve null si no hay ningún recurso cargado', () => {
    const resultado = findRecursoDisponible({
      recursos: [],
      subtipo: 'futbol_5',
      hora: '18:00',
      citasExistentes: [],
    });
    expect(resultado).toBeNull();
  });
});
