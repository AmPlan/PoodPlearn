import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

import { auth, handleAuthError } from '@/lib/auth';

// Get current session
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, session });
  } catch (error) {
    return handleAuthError(error, 'Unable to load session');
  }
}
