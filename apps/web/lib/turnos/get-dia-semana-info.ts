const DIAS: string[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

interface DiaSemanaInfo {
  diaSemana: number; // 0 = domingo ... 6 = sábado
  diaKey: string; // clave usada en negocio.horarios
}

export function getDiaSemanaInfo(fecha: string): DiaSemanaInfo {
  // Parseamos como UTC explícitamente — "new Date('YYYY-MM-DD')" ya lo hace así,
  // pero usamos getUTCDay() (no getDay()) para no depender del timezone del
  // servidor, que podría correr la fecha un día para atrás o adelante.
  const date = new Date(`${fecha}T00:00:00Z`);
  const diaSemana = date.getUTCDay();
  return { diaSemana, diaKey: DIAS[diaSemana] };
}
