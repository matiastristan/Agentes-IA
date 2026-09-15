import { describe, it, expect } from 'vitest';
import { pickCalendarView } from './pick-calendar-view';

describe('pickCalendarView', () => {
  it('0 recursos activos → vista semana', () => {
    expect(pickCalendarView(0)).toBe('semana');
  });

  it('1 recurso activo → vista semana', () => {
    expect(pickCalendarView(1)).toBe('semana');
  });

  it('2 recursos activos → vista día', () => {
    expect(pickCalendarView(2)).toBe('dia');
  });

  it('muchos recursos activos → vista día', () => {
    expect(pickCalendarView(5)).toBe('dia');
  });
});
