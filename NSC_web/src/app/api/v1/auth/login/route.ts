import { NextRequest, NextResponse } from 'next/server';

import { auth, handleAuthError } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { getEmail } from '@/lib/shared/utils/emailUtils';

type LoginBody = {
  account: string;
  password: string;
};

// Log in Patient
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LoginBody;
    const account = body.account;
    const password = body.password;

    if (!account || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: account and password.' },
        { status: 400 }
      );
    }

    // Route through Better Auth's HTTP handler so its sign-in rate limits apply.
    // auth.api.signInEmail is a server-side API and intentionally bypasses them.
    const authRequest = new Request(new URL('/api/auth/sign-in/email', req.url), {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({
        email: getEmail(account),
        password,
        rememberMe: false,
      }),
    });
    const authResponse = await auth.handler(authRequest);
    const authData = await authResponse.json().catch(() => null) as
      | { user?: { id?: string }; message?: string; error?: string }
      | null;

    if (!authResponse.ok || !authData?.user?.id) {
      return NextResponse.json(
        { error: authResponse.status === 429 ? 'Too many login attempts. Please try again later.' : 'Invalid account or password.' },
        { status: authResponse.status || 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authData.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        patients: { select: { patientId: true }, take: 1 },
        therapists: { select: { therapistId: true }, take: 1 },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Unable to load account profile.' }, { status: 500 });
    }

    const response = NextResponse.json({
      userId: user.id,
      account: user.email.replace('@local.internal', ''),
      role: user.role,
      patientId: user.patients[0]?.patientId ?? null,
      therapistId: user.therapists[0]?.therapistId ?? null,
    });
    for (const cookie of authResponse.headers.getSetCookie()) {
      response.headers.append('set-cookie', cookie);
    }
    return response;
  } catch (error) {
    return handleAuthError(error, "Unable to log in");
  }
}
