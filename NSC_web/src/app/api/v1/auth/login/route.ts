import { NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME, signSession, type UserRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type LoginBody = {
  account?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LoginBody;
    const account = body.account?.trim();
    const password = body.password;

    // 1. We no longer require the 'role' to be sent from the frontend
    if (!account || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: account and password.' },
        { status: 400 }
      );
    }

    // 2. Search for the user solely by their unique account name
    const user = await prisma.user.findFirst({
      where: {
        account,
      },
      include: {
        patients: true,
        therapists: true,
      },
    });

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid account or password.' },
        { status: 401 }
      );
    }

    // 3. The role is safely extracted from the database record here
    const session = signSession({
      userId: user.userId,
      account: user.account,
      role: user.role as UserRole,
      patientId: user.patients?.[0]?.patientId,
      therapistId: user.therapists?.[0]?.therapistId,
    });

    const response = NextResponse.json({
      userId: user.userId,
      account: user.account,
      role: user.role,
      patientId: user.patients?.[0]?.patientId ?? null,
      therapistId: user.therapists?.[0]?.therapistId ?? null,
    });

    response.cookies.set(AUTH_COOKIE_NAME, session, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Failed to log in:', error);
    return NextResponse.json({ error: 'Unable to log in.' }, { status: 500 });
  }
}