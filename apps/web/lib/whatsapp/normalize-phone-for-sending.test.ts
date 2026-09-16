import { describe, it, expect } from 'vitest';
import { normalizePhoneForSending } from './normalize-phone-for-sending';

describe('normalizePhoneForSending', () => {
  it('quita el 9 extra de números argentinos (549... -> 54...)', () => {
    expect(normalizePhoneForSending('5493876289131')).toBe('543876289131');
  });

  it('funciona con otro número argentino distinto (Buenos Aires, código 11)', () => {
    expect(normalizePhoneForSending('5491123456789')).toBe('541123456789');
  });

  it('no toca números argentinos que ya vienen sin el 9', () => {
    expect(normalizePhoneForSending('543876289131')).toBe('543876289131');
  });

  it('deja intactos números que no empiezan con 54 en absoluto (otros países)', () => {
    expect(normalizePhoneForSending('12125551234')).toBe('12125551234');
  });
});
