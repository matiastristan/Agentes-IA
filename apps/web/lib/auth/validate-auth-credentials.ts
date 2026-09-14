interface Credentials {
  email: string;
  password: string;
}

interface ValidationResult {
  valid: boolean;
  errors: { email?: string; password?: string };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuthCredentials({ email, password }: Credentials): ValidationResult {
  const errors: ValidationResult['errors'] = {};

  if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Ingresá un email válido';
  }

  if (password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
