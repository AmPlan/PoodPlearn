import { createHmac, timingSafeEqual } from 'node:crypto';

export type UserRole = 'PATIENT' | 'THERAPIST';

export const AUTH_COOKIE_NAME = 'nsc_session';
const AUTH_SECRET = process.env.AUTH_SECRET ?? 'dev-auth-secret-change-me';

export type SessionData = {
  userId: number;
  account: string;
  role: UserRole;
  patientId?: number;
  therapistId?: number;
};

export function signSession(session: SessionData) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');

  return `${payload}.${signature}`;
}

export function verifySession(cookieValue?: string | null): SessionData | null {
  if (!cookieValue) {
    return null;
  }

  const [payload, signature] = cookieValue.split('.');
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionData;

    if (
      typeof session.userId !== 'number' ||
      typeof session.account !== 'string' ||
      (session.role !== 'PATIENT' && session.role !== 'THERAPIST')
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
