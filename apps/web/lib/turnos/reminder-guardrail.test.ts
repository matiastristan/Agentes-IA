import { describe, it, expect } from 'vitest';
import { checkReminderGuardrail } from './reminder-guardrail';

describe('checkReminderGuardrail', () => {
  it('una regla dentro de las 24hs (1440 min) nunca requiere alerta', () => {
    expect(checkReminderGuardrail(1440, false).requiereAlerta).toBe(false);
    expect(checkReminderGuardrail(120, false).requiereAlerta).toBe(false);
  });

  it('una regla de más de 24hs sin plantillas habilitadas requiere alerta', () => {
    const result = checkReminderGuardrail(2880, false);
    expect(result.requiereAlerta).toBe(true);
    expect(result.motivo).toMatch(/plantilla|24/i);
  });

  it('una regla de más de 24hs CON plantillas habilitadas no requiere alerta', () => {
    expect(checkReminderGuardrail(2880, true).requiereAlerta).toBe(false);
  });

  it('exactamente 1440 minutos (el límite) no requiere alerta', () => {
    expect(checkReminderGuardrail(1440, false).requiereAlerta).toBe(false);
  });

  it('1441 minutos (un minuto pasado el límite) sí requiere alerta sin plantillas', () => {
    expect(checkReminderGuardrail(1441, false).requiereAlerta).toBe(true);
  });
});
