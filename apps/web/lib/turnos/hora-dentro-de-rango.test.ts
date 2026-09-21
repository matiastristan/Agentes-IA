import { describe, it, expect } from 'vitest';
import { horaDentroDeRango } from './hora-dentro-de-rango';

describe('horaDentroDeRango', () => {
  it('la hora de inicio está dentro del rango', () => {
    expect(horaDentroDeRango('18:00', '18:00:00', '20:00:00')).toBe(true);
  });

  it('una hora intermedia está dentro del rango (el bug: 19:00 en un abono 18-20)', () => {
    expect(horaDentroDeRango('19:00', '18:00:00', '20:00:00')).toBe(true);
  });

  it('la hora de fin NO está dentro del rango (20:00 en un abono 18-20 ya queda libre)', () => {
    expect(horaDentroDeRango('20:00', '18:00:00', '20:00:00')).toBe(false);
  });

  it('una hora anterior al inicio no está dentro', () => {
    expect(horaDentroDeRango('17:00', '18:00:00', '20:00:00')).toBe(false);
  });

  it('una hora posterior al fin no está dentro', () => {
    expect(horaDentroDeRango('21:00', '18:00:00', '20:00:00')).toBe(false);
  });

  it('un abono de una sola hora ocupa solo esa hora', () => {
    expect(horaDentroDeRango('20:00', '20:00:00', '21:00:00')).toBe(true);
    expect(horaDentroDeRango('21:00', '20:00:00', '21:00:00')).toBe(false);
  });

  it('un abono que cruza medianoche (22:00 a 00:00) ocupa 22 y 23', () => {
    expect(horaDentroDeRango('22:00', '22:00:00', '00:00:00')).toBe(true);
    expect(horaDentroDeRango('23:00', '22:00:00', '00:00:00')).toBe(true);
  });

  it('un abono que cruza medianoche no ocupa horas de la mañana del mismo día', () => {
    expect(horaDentroDeRango('10:00', '22:00:00', '00:00:00')).toBe(false);
  });

  it('acepta horas con y sin segundos indistintamente', () => {
    expect(horaDentroDeRango('19:00:00', '18:00', '20:00')).toBe(true);
  });
});
