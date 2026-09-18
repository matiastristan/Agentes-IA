interface ServicioInput {
  nombre: string;
  duracionMinutos: number;
  precio: number;
}

interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof ServicioInput, string>>;
}

export function validateServicio(input: ServicioInput): ValidationResult {
  const errors: ValidationResult['errors'] = {};

  if (!input.nombre.trim()) {
    errors.nombre = 'El nombre es obligatorio';
  }
  if (input.duracionMinutos <= 0) {
    errors.duracionMinutos = 'La duración tiene que ser mayor a 0';
  }
  if (input.precio < 0) {
    errors.precio = 'El precio no puede ser negativo';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
