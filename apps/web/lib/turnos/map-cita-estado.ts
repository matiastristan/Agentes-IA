type TurnoCardEstado = 'disponible' | 'ocupado' | 'no_show' | 'reprogramada';

export function mapCitaEstadoToTurnoCardEstado(citaEstado: string): TurnoCardEstado {
  switch (citaEstado) {
    case 'cancelada':
      return 'disponible';
    case 'no_show':
      return 'no_show';
    case 'reprogramada':
      return 'reprogramada';
    case 'pendiente':
    case 'confirmada':
    case 'completada':
    default:
      return 'ocupado';
  }
}
