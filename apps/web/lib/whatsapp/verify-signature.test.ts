import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyMetaSignature } from './verify-signature';

const APP_SECRET = 'test-app-secret';

function signPayload(payload: string, secret: string) {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
}

describe('verifyMetaSignature', () => {
  it('acepta una firma válida generada con el app secret correcto', () => {
    const payload = JSON.stringify({ entry: [] });
    const signature = signPayload(payload, APP_SECRET);
    expect(verifyMetaSignature(payload, signature, APP_SECRET)).toBe(true);
  });

  it('rechaza una firma generada con un secret distinto', () => {
    const payload = JSON.stringify({ entry: [] });
    const signature = signPayload(payload, 'otro-secret');
    expect(verifyMetaSignature(payload, signature, APP_SECRET)).toBe(false);
  });

  it('rechaza si el payload fue modificado después de firmarlo', () => {
    const original = JSON.stringify({ entry: [] });
    const signature = signPayload(original, APP_SECRET);
    const tampered = JSON.stringify({ entry: ['inyectado'] });
    expect(verifyMetaSignature(tampered, signature, APP_SECRET)).toBe(false);
  });

  it('rechaza si falta el header de firma', () => {
    const payload = JSON.stringify({ entry: [] });
    expect(verifyMetaSignature(payload, null, APP_SECRET)).toBe(false);
  });

  it('rechaza si la firma no tiene el prefijo sha256=', () => {
    const payload = JSON.stringify({ entry: [] });
    const rawHex = createHmac('sha256', APP_SECRET).update(payload).digest('hex');
    expect(verifyMetaSignature(payload, rawHex, APP_SECRET)).toBe(false);
  });
});
