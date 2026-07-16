import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { resolveAssessmentCategories } from '@/lib/assessmentCategories';
import { prisma } from '@/lib/prisma';

type CreateAssessmentBody = {
  patientId?: number;
  setId?: number;
};

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const patientIdParam = searchParams.get('patientId');
    const patientId = patientIdParam ? Number(patientIdParam) : undefined;

    if (patientIdParam && Number.isNaN(patientId)) {
      return NextResponse.json(
        { error: 'patientId must be a number.' },
        { status: 400 }
      );
    }

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

      limit = Math.min(parsedLimit, 100);
    }

    if (session.role !== 'THERAPIST') {
      if (patientId && patientId !== session.patientId) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
    }

    const effectivePatientId =
      session.role === 'THERAPIST'
        ? patientId
        : session.patientId;

    const assessments = await prisma.assessmentResult.findMany({
      where: {
        ...(effectivePatientId
          ? { patientId: effectivePatientId }
          : {}),
        endedAt: {
          not: null,
        },
      },
      include: {
        trainingSet: true,
        patient: {
          select: {
            patientId: true,
            patientFirstName: true,
            patientLastName: true,
          },
        },
        assessmentCategoryResults: {
          include: {
            category: true,
            recommendedDifficulty: true,
          },
        },
      },
      orderBy: {
        endedAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json(
      {
        message: 'Assessments fetched successfully.',
        data: assessments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch assessments:', error);

    return NextResponse.json(
      { error: 'Unable to fetch assessments.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await req.json()) as CreateAssessmentBody;

    if (!body.patientId || typeof body.patientId !== 'number') {
      return NextResponse.json(
        { error: 'patientId is required and must be a number.' },
        { status: 400 }
      );
    }

    if (body.setId !== undefined && typeof body.setId !== 'number') {
      return NextResponse.json(
        { error: 'setId must be a number when provided.' },
        { status: 400 }
      );
    }

    if (session.role !== 'THERAPIST' && session.patientId !== body.patientId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const patient = await prisma.patient.findUnique({
      where: { patientId: body.patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    const patientId = body.patientId;
    const setId = body.setId;

    const result = await prisma.$transaction(async (tx) => {
      const categories = await resolveAssessmentCategories(tx);

      const assessment = await tx.assessmentResult.create({
        data: {
          patientId,
          ...(setId !== undefined ? { setId } : {}),
        },
      });

      await tx.assessmentCategoryResult.createMany({
        data: categories.map((category) => ({
          assessmentResultId: assessment.assessmentResultId,
          categoryId: category.categoryId,
          totalScore: 0,
          maxScore: 0,
          recommendedDifficultyId: null,
        })),
      });

      const categoryResults = await tx.assessmentCategoryResult.findMany({
        where: { assessmentResultId: assessment.assessmentResultId },
        include: { category: true },
        orderBy: { assessmentCategoryResultId: 'asc' },
      });

      return { assessment, categoryResults };
    });

    return NextResponse.json(
      {
        message: 'Assessment started successfully.',
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create assessment:', error);
    return NextResponse.json(
      { error: 'Unable to create assessment.' },
      { status: 500 }
    );
  }
}