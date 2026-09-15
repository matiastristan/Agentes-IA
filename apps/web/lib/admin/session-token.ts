import { createHmac, timingSafeEqual } from 'node:crypto';

export function createSessionToken(adminId: string): string {
  const payload = Buffer.from(JSON.stringify({ adminId })).toString('base64url');
  const signature = createHmac('sha256', process.env.ADMIN_SESSION_SECRET!)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): { adminId: string } | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expectedSignature = createHmac('sha256', process.env.ADMIN_SESSION_SECRET!)
    .update(payload)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return { adminId: decoded.adminId };
  } catch {
    return null;
  }
}
