import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { AuthSession, withAuth } from '@/lib/auth';
import { checkPatientPermission } from '@/lib/server/utils/patientUtils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const GET = withAuth(['PATIENT', 'THERAPIST'], async (
  _req: NextRequest,
  session: AuthSession,
  { params }: RouteContext
) => {
  try {
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

    const permission = await checkPatientPermission(session, sessionResult.patientId);
    if (permission !== true) {
      return permission;
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
});
