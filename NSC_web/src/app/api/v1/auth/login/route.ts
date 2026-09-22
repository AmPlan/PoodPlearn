import { NextRequest, NextResponse } from 'next/server';

import { auth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

    const user = await prisma.user.findUnique({
      where: { id: data.user.id },
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

    return NextResponse.json({
      userId: user.id,
      account: user.email.replace('@local.internal', ''),
      role: user.role,
      patientId: user.patients[0]?.patientId ?? null,
      therapistId: user.therapists[0]?.therapistId ?? null,
    });
  } catch (error) {
    return handleAuthError(error, "Unable to log in");
  }
}