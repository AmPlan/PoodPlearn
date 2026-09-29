import { NextResponse } from 'next/server';

import { checkPatientPermission } from '@/lib/server/utils/patientUtils';
import { auth } from '@/lib/auth';

type AuthSuccess = { ok: true; session: Session };
type AuthFailure = { ok: false; response: NextResponse };
type Session = typeof auth.$Infer.Session;

/**
 * Verifies the session cookie and confirms the caller may access the given
 * patient's data. Therapists can access any patient; patients only themselves.
 */
export async function authorizePatientAccess(
  patientId: number,
  session: Session
): Promise<AuthSuccess | AuthFailure> {
  const permission = await checkPatientPermission(session, patientId);
  if (permission !== true) {
    return {
      ok: false,
      response: permission,
    };
  }

  return { ok: true, session };
}

export function parsePatientId(raw: string): number | null {
  const patientId = Number(raw);
  return Number.isInteger(patientId) && patientId > 0 ? patientId : null;
}