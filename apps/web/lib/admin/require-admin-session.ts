import { NextRequest } from 'next/server';
import { verifySessionToken } from './session-token';

export function requireAdminSession(request: NextRequest): { adminId: string } | null {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
