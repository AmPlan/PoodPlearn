import { NextRequest, NextResponse } from 'next/server';

import { auth, getEmail, handleAuthError } from '@/lib/auth';
import { headers } from 'next/headers';

type SignUpBody = {
  account: string;
  password: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SignUpBody;
    const account = body.account;
    const password = body.password;

    if (!account || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: account and password.' },
        { status: 400 }
      );
    }

    const data = await auth.api.signUpEmail({
      body: {
        name: account,
        email: getEmail(account),
        password: password, // at least 8 characters long and max 128 by default.
      },
      headers: await headers(),
    });


    return NextResponse.json(data);
  } catch (error: any) {
      return handleAuthError(error, "Failed to sign up");
  }
}