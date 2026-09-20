import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

import { auth, handleAuthError } from '@/lib/auth';

export async function POST() {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error, 'Unable to log out');
  }
}
