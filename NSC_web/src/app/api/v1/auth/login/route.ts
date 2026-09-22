import { NextRequest, NextResponse } from 'next/server';

import { auth, handleAuthError } from '@/lib/auth';
import { headers } from 'next/headers';
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

    const data = await auth.api.signInEmail({
      body: {
        email: getEmail(account),
        password: password, // at least 8 characters long and max 128 by default.
        rememberMe: true,
      },
      headers: await headers(),
    });


    return NextResponse.json(data);
  } catch (error) {
    return handleAuthError(error, "Unable to log in");
  }
}