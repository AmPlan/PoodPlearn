import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { checkPatientPermission, getPatientId } from '@/lib/server/utils/patientUtils';

type CreateSessionBody = {
  patientId?: number;
  setId: number;
  dailyPlanScheduleId?: number;
};

export const GET = withAuth(['PATIENT', 'THERAPIST'], async (req: NextRequest, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const patientIdParam = searchParams.get('patientId');
    const patientId = patientIdParam ? Number(patientIdParam) : undefined;

    if (patientIdParam && Number.isNaN(patientId)) {
      return NextResponse.json(
        { error: 'patientId must be a number.' },
        { status: 400 }
      );
    }

    // Optional limit for how many recent sessions to return (newest first).
    const limitParam = searchParams.get('limit');
    let limit = 10;
    if (limitParam) {
      const parsedLimit = Number(limitParam);
      if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
        return NextResponse.json(
          { error: 'limit must be a positive number.' },
          { status: 400 }
        );
      }
      // Cap it to avoid someone requesting an unbounded result set.
      limit = Math.min(parsedLimit, 100);
    }

    // Patients can only ever see their own sessions.
    const isPrivileged = session.user.role === 'THERAPIST' || session.user.role === 'ADMIN';
    if (patientId) {
      const permission = await checkPatientPermission(session, patientId);
      if (permission !== true) {
        return permission;
      }
    }

    const ownPatientId = isPrivileged ? undefined : await getPatientId(session);
    if (!isPrivileged && ownPatientId === undefined) {
      return NextResponse.json({ error: 'Patient profile not found.' }, { status: 404 });
    }
    const effectivePatientId = isPrivileged ? patientId : ownPatientId;

    const sessions = await prisma.sessionResult.findMany({
      where: {
        ...(effectivePatientId ? { patientId: effectivePatientId } : {}),
        sessionCategoryResult: {
          endedAt: { not: null },
        },
      },
      include: {
        sessionCategoryResult: {
          include: {
            trainingSet: true,
          },
        },
        patient: {
          select: {
            patientId: true,
            patientFirstName: true,
            patientLastName: true,
          },
        },
      },
      orderBy: {
        sessionCategoryResult: {
          endedAt: 'desc', // newest to oldest
        },
      },
      take: limit,
    });

    return NextResponse.json(
      {
        message: 'Sessions fetched successfully.',
        data: sessions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json(
      { error: 'Unable to fetch sessions' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(['PATIENT', 'THERAPIST'], async (req: NextRequest, session) => {
  try {
    const body = (await req.json()) as CreateSessionBody;

    if (!body.setId || typeof body.setId !== 'number') {
      return NextResponse.json(
        { error: 'setId is required and must be a number.' },
        { status: 400 }
      );
    }

    if (!body.patientId || typeof body.patientId !== 'number') {
      return NextResponse.json(
        { error: 'patientId is required and must be a number.' },
        { status: 400 }
      );
    }

    if (
      body.dailyPlanScheduleId !== undefined &&
      (!Number.isInteger(body.dailyPlanScheduleId) || body.dailyPlanScheduleId <= 0)
    ) {
      return NextResponse.json(
        { error: 'dailyPlanScheduleId must be a positive integer.' },
        { status: 400 }
      );
    }

    const permission = await checkPatientPermission(session, body.patientId);
    if (permission !== true) {
      return permission;
    }

    const patient = await prisma.patient.findUnique({
      where: { patientId: body.patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const sessionResult = await tx.sessionResult.create({
        data: {
          patientId: body.patientId!,
        },
      });

      if (body.dailyPlanScheduleId) {
        const dailyPlanSchedule = await tx.dailyPlanSchedule.findUnique({
          where: { dailyPlanScheduleId: body.dailyPlanScheduleId },
          select: { trainingPlan: {select: {patientId: true}}, status: true },
        });

        if (!dailyPlanSchedule) {
          throw new Error('Daily plan schedule not found.');
        }

        if (dailyPlanSchedule.trainingPlan.patientId !== body.patientId) {
          throw new Error('Daily plan schedule does not belong to this patient.');
        }

        await tx.dailyPlanSchedule.update({
          where: { dailyPlanScheduleId: body.dailyPlanScheduleId },
          data: {
            sessionId: sessionResult.sessionId,
          },
        });
      }

      let sessionCategoryResult = null;

      const trainingSet = await tx.trainingSet.findUnique({
        where: { setId: body.setId },
      });
      if (!trainingSet) {
        throw new Error('Training set not found.');
      }
      if (trainingSet.isStandardAssessment) {
        throw new Error('Training set must not be Standard Assessment.');
      }
      sessionCategoryResult = await tx.sessionCategoryResult.create({
        data: {
          sessionId: sessionResult.sessionId,
          setId: body.setId,
          totalScore: 0,
          averageResponseTime: 0,
          averageHintUsed: 0,
        },
      });

      return { sessionResult, sessionCategoryResult };
    });

    return NextResponse.json(
      {
        message: 'Session started successfully.',
        data: result.sessionResult,
        sessionCategoryId: result.sessionCategoryResult?.sessionCategoryId ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: 'Unable to create session' },
      { status: 500 }
    );
  }
});
