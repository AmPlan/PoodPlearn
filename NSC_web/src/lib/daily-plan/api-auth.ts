import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';

type Session = NonNullable<ReturnType<typeof verifySession>>;

type AuthSuccess = { ok: true; session: Session };
type AuthFailure = { ok: false; response: NextResponse };

/**
 * Verifies the session cookie and confirms the caller may access the given
 * patient's data. Therapists can access any patient; patients only themselves.
 */
export async function authorizePatientAccess(
  patientId: number
): Promise<AuthSuccess | AuthFailure> {
  const cookieStore = await cookies();
  const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }),
    };
  }

  if (session.role !== 'THERAPIST' && session.patientId !== patientId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }),
    };
  }

  return { ok: true, session };
}

export function parsePatientId(raw: string): number | null {
  const patientId = Number(raw);
  return Number.isInteger(patientId) && patientId > 0 ? patientId : null;
}