import { NextResponse } from 'next/server';
import { resolveAssessmentCategories } from '@/lib/assessmentCategories';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { checkPatientPermission } from '@/server/utils/patientUtils';
import { z } from 'zod';


type CreateAssessmentBody = {
  patientId?: number;
  setId?: number;
};

const getQuerySchema = z.object({
  patientId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const GET = withAuth(["PATIENT", "THERAPIST"], async (req, session) => {
  try {
    const parsed = getQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams)
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid query parameters.' },
        { status: 400 }
      );
    }

    const { patientId, limit } = parsed.data;

    if (patientId) {
      const permissionError = await checkPatientPermission(session, patientId);
      if (permissionError instanceof NextResponse) {
        return permissionError;
      }
    } else if (!["THERAPIST", "ADMIN"].includes(session.user.role ?? "")) {
      return NextResponse.json(
        { error: 'patientId is required.' },
        { status: 400 }
      );
    }

    const assessments = await prisma.assessmentResult.findMany({
      where: {
        ...(patientId && { patientId }),
        endedAt: { not: null },
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
      orderBy: { endedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(
      { message: 'Assessments fetched successfully.', data: assessments },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch assessments:', error);
    return NextResponse.json(
      { error: 'Unable to fetch assessments.' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(["PATIENT", "THERAPIST"], async (req, session) => {
  try {
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
})