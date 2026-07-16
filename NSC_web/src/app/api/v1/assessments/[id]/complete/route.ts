import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { resolveAssessmentCategories, getRecommendedAssessmentExercise, getAssessmentCategoryKey, getAssessmentCategoryId } from '@/lib/assessmentCategories';
import { prisma } from '@/lib/prisma';

type CompleteAssessmentContext = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function POST(_req: NextRequest, context: CompleteAssessmentContext) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const params = await context.params;
    const assessmentResultId = Number(params.id);

    if (!Number.isInteger(assessmentResultId) || assessmentResultId <= 0) {
      return NextResponse.json({ error: 'Invalid assessment ID.' }, { status: 400 });
    }

    const assessment = await prisma.assessmentResult.findUnique({
      where: { assessmentResultId },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
    }

    if (assessment.endedAt) {
      return NextResponse.json(
        { error: 'Assessment is already completed.' },
        { status: 400 }
      );
    }

    if (session.role !== 'THERAPIST' && session.patientId !== assessment.patientId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const assessmentCategories = await resolveAssessmentCategories(prisma);

    const categoryResults = await prisma.assessmentCategoryResult.findMany({
      where: { assessmentResultId },
      include: { category: true },
    });

    if (categoryResults.length === 0) {
      return NextResponse.json(
        { error: 'Cannot complete an assessment with no category results.' },
        { status: 400 }
      );
    }

    const categoryResultMap = new Map(categoryResults.map((categoryResult) => [categoryResult.categoryId, categoryResult]));

    const result = await prisma.$transaction(async (tx) => {
      for (const category of assessmentCategories) {
        const existing = categoryResultMap.get(category.categoryId);

        if (!existing) continue;

        const totalScore = Number(existing.totalScore); 
        const recommendedDifficultyId = getRecommendedAssessmentExercise(getAssessmentCategoryId(category.categoryId)!, totalScore);
  

        await tx.assessmentCategoryResult.update({
          where: {
            assessmentCategoryResultId: existing.assessmentCategoryResultId,
          },
          data: {
            recommendedDifficultyId,
          },
        });
      }

      const updated = await tx.assessmentResult.update({
        where: { assessmentResultId },
        data: { endedAt: new Date() },
      });

      const refreshedCategoryResults = await tx.assessmentCategoryResult.findMany({
        where: { assessmentResultId },
        include: { category: true },
        orderBy: { assessmentCategoryResultId: 'asc' },
      });

      return { assessment: updated, categoryResults: refreshedCategoryResults };
    });

    return NextResponse.json(
      {
        message: 'Assessment completed successfully.',
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to complete assessment:', error);
    return NextResponse.json(
      { error: 'Unable to complete assessment.' },
      { status: 500 }
    );
  }
}