import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const sessionId = Number(id);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: 'Invalid session ID.' }, { status: 400 });
    }

    const sessionResult = await prisma.sessionResult.findUnique({
      where: { sessionId },
      include: {
        sessionCategoryResult: {
          include: {
            trainingSet: true,
          },
        },
      },
    });

    if (!sessionResult) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    if (session.role !== 'THERAPIST' && session.patientId !== sessionResult.patientId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    return NextResponse.json(
      {
        data: {
          sessionResult,
          sessionCategoryResult: sessionResult.sessionCategoryResult,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return NextResponse.json({ error: 'Unable to fetch session.' }, { status: 500 });
  }
}
