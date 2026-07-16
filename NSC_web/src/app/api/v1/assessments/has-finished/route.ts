import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export async function GET(req: NextRequest) {
  try {
    const internalHeader = req.headers.get('x-internal-api-key');
    const isInternalCall =
      !!INTERNAL_API_SECRET && internalHeader === INTERNAL_API_SECRET;

    let session: Awaited<ReturnType<typeof verifySession>> | null = null;

    if (!isInternalCall) {
      const cookieStore = await cookies();
      session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

      if (!session) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
      }
    }

    const rawPatientId = req.nextUrl.searchParams.get('patientId');
    const targetPatientId = Number(rawPatientId);

    if (!Number.isInteger(targetPatientId) || targetPatientId <= 0) {
      return NextResponse.json({ error: 'Invalid patientId.' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { patientId: targetPatientId },
      select: { patientId: true, userId: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    // Internal calls skip the ownership/role check; user calls still enforce it.
    if (
      !isInternalCall &&
      session!.role !== 'THERAPIST' &&
      session!.userId !== patient.userId
    ) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const finishedAssessmentCount = await prisma.assessmentResult.count({
      where: {
        patientId: patient.patientId,
        endedAt: { not: null },
      },
    });

    return NextResponse.json(
      {
        hasFinishedAssessment: finishedAssessmentCount > 0,
        finishedAssessmentCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to check finished assessments:', error);
    return NextResponse.json(
      { error: 'Unable to check finished assessments.' },
      { status: 500 }
    );
  }
}