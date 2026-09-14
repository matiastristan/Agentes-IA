import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from './system-prompt';

const baseNegocio = {
  nombre: 'Barbería Juan',
  tono_voz: 'casual',
  horarios: { lunes: '9:00-18:00', martes: '9:00-18:00' },
  catalogo: [{ nombre: 'Corte clásico', precio: 3500 }],
  tier: 'base' as const,
};

describe('buildSystemPrompt', () => {
  it('interpola el nombre del negocio en el prompt', () => {
    const prompt = buildSystemPrompt(baseNegocio);
    expect(prompt).toContain('Barbería Juan');
  });

  it('interpola el tono de voz', () => {
    const prompt = buildSystemPrompt(baseNegocio);
    expect(prompt).toContain('casual');
  });

  it('incluye los horarios en formato legible', () => {
    const prompt = buildSystemPrompt(baseNegocio);
    expect(prompt).toContain('lunes: 9:00-18:00');
  });

  it('incluye el catálogo con precios', () => {
    const prompt = buildSystemPrompt(baseNegocio);
    expect(prompt).toContain('Corte clásico');
    expect(prompt).toContain('3500');
  });

  it('menciona las tools disponibles para tier base sin mencionar procesar_pago', () => {
    const prompt = buildSystemPrompt(baseNegocio);
    expect(prompt).toContain('consultar_disponibilidad');
    expect(prompt).toContain('registrar_cita');
    expect(prompt).not.toContain('procesar_pago');
  });

  it('menciona procesar_pago cuando el tier es pro', () => {
    const prompt = buildSystemPrompt({ ...baseNegocio, tier: 'pro' });
    expect(prompt).toContain('procesar_pago');
  });

  it('usa un tono de voz neutro por default si tono_voz es null', () => {
    const prompt = buildSystemPrompt({ ...baseNegocio, tono_voz: null });
    expect(prompt).toContain('profesional y amable');
  });

  it('avisa cuando el catálogo está vacío en vez de mostrar una lista vacía', () => {
    const prompt = buildSystemPrompt({ ...baseNegocio, catalogo: [] });
    expect(prompt).toContain('catálogo aún no fue cargado');
  });
});
