import { describe, it, expect, vi } from 'vitest';
import { categorizeTemperatura } from './categorize-temperature';

describe('categorizeTemperatura', () => {
  it('devuelve "caliente" cuando el modelo responde eso', async () => {
    const callOpenRouter = vi.fn().mockResolvedValue({ message: { content: 'caliente' } });
    const result = await categorizeTemperatura([{ role: 'user', content: 'Quiero comprar ya' }], callOpenRouter);
    expect(result).toBe('caliente');
  });

  it('normaliza mayúsculas y espacios de más', async () => {
    const callOpenRouter = vi.fn().mockResolvedValue({ message: { content: '  Caliente  \n' } });
    const result = await categorizeTemperatura([{ role: 'user', content: 'hola' }], callOpenRouter);
    expect(result).toBe('caliente');
  });

  it('devuelve "frio" por defecto si la respuesta no es una de las 3 esperadas', async () => {
    const callOpenRouter = vi.fn().mockResolvedValue({ message: { content: 'no estoy seguro' } });
    const result = await categorizeTemperatura([{ role: 'user', content: 'hola' }], callOpenRouter);
    expect(result).toBe('frio');
  });

  it('devuelve "frio" por defecto si callOpenRouter tira una excepción', async () => {
    const callOpenRouter = vi.fn().mockRejectedValue(new Error('falló'));
    const result = await categorizeTemperatura([{ role: 'user', content: 'hola' }], callOpenRouter);
    expect(result).toBe('frio');
  });
});
