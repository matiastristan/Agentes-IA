import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './hash-password';

describe('hashPassword / verifyPassword', () => {
  it('un password verificado contra su propio hash da true', async () => {
    const hash = await hashPassword('MiPassword123!');
    expect(await verifyPassword('MiPassword123!', hash)).toBe(true);
  });

  it('un password incorrecto contra el hash da false', async () => {
    const hash = await hashPassword('MiPassword123!');
    expect(await verifyPassword('OtroPassword', hash)).toBe(false);
  });

  it('el hash nunca es igual al password en texto plano', async () => {
    const hash = await hashPassword('MiPassword123!');
    expect(hash).not.toBe('MiPassword123!');
  });

  it('dos hashes del mismo password son distintos entre sí (salt aleatorio)', async () => {
    const hash1 = await hashPassword('MiPassword123!');
    const hash2 = await hashPassword('MiPassword123!');
    expect(hash1).not.toBe(hash2);
  });
});
