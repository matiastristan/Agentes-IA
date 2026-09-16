import { describe, it, expect } from 'vitest';
import { shouldTriggerLeadAlert } from './should-trigger-lead-alert';

describe('shouldTriggerLeadAlert', () => {
  it('no dispara si la feature no está habilitada para el negocio, aunque sea caliente y con 3+ mensajes', () => {
    expect(
      shouldTriggerLeadAlert({ temperatura: 'caliente', cantidadMensajesUsuario: 3, featureHabilitada: false })
    ).toBe(false);
  });

  it('no dispara si hay menos de 3 mensajes del usuario, aunque sea caliente y la feature esté habilitada', () => {
    expect(
      shouldTriggerLeadAlert({ temperatura: 'caliente', cantidadMensajesUsuario: 2, featureHabilitada: true })
    ).toBe(false);
  });

  it('no dispara si la temperatura no es caliente, aunque haya 3+ mensajes y la feature esté habilitada', () => {
    expect(
      shouldTriggerLeadAlert({ temperatura: 'moderado', cantidadMensajesUsuario: 5, featureHabilitada: true })
    ).toBe(false);
  });

  it('dispara cuando las 3 condiciones se cumplen a la vez', () => {
    expect(
      shouldTriggerLeadAlert({ temperatura: 'caliente', cantidadMensajesUsuario: 3, featureHabilitada: true })
    ).toBe(true);
  });

  it('dispara también con más de 3 mensajes (no solo exactamente 3)', () => {
    expect(
      shouldTriggerLeadAlert({ temperatura: 'caliente', cantidadMensajesUsuario: 7, featureHabilitada: true })
    ).toBe(true);
  });
});
