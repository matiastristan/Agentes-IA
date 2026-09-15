export function pickCalendarView(recursosActivos: number): 'semana' | 'dia' {
  return recursosActivos >= 2 ? 'dia' : 'semana';
}
