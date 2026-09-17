interface AltaNegocioInput {
  nombreNegocio: string;
  email: string;
  tipoCrm: 'ventas' | 'turnos';
  rubro: string;
  phoneNumberId: string;
  accessToken: string;
}

interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof AltaNegocioInput, string>>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAltaNegocio(input: AltaNegocioInput): ValidationResult {
  const errors: ValidationResult['errors'] = {};

  if (!input.nombreNegocio.trim()) {
    errors.nombreNegocio = 'El nombre del negocio es obligatorio';
  }
  if (!EMAIL_REGEX.test(input.email)) {
    errors.email = 'Email inválido';
  }
  if (!input.phoneNumberId.trim()) {
    errors.phoneNumberId = 'El Phone Number ID es obligatorio';
  }
  if (!input.accessToken.trim()) {
    errors.accessToken = 'El access token es obligatorio';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
