import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { keepLatestItemsByQuestionId } from '@/lib/latestItemResults';
import { prisma } from '@/lib/prisma';

type CompleteSessionContext = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: CompleteSessionContext) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const params = await context.params;
    const sessionId = Number(params.id);
    const body = (await req.json().catch(() => ({}))) as {
      dailyPlanScheduleId?: number;
    };

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: 'Invalid session ID.' }, { status: 400 });
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

    const sessionResult = await prisma.sessionResult.findUnique({
      where: { sessionId },
    });

    if (!sessionResult) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    if (session.role !== 'THERAPIST' && session.patientId !== sessionResult.patientId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const existingCategories = await prisma.sessionCategoryResult.findMany({
      where: { sessionId },
      include: {
        trainingSet: {
          include: {
            difficultyLevel: true,
            category: true,
            setQuestions: true,
          },
        },
        sessionItemResults: true,
      },
      orderBy: {
        sessionCategoryId: 'asc',
      },
    });

    if (existingCategories.length === 0) {
      return NextResponse.json(
        { error: 'Cannot complete a session with no items.' },
        { status: 400 }
      );
    }

    const sessionItemsWithTrainingSets = await prisma.sessionItemResult.findMany({
      where: {
        sessionCategoryId: { in: existingCategories.map((category) => category.sessionCategoryId) },
        sessionCategoryResult: {
          sessionId,
        },
      },
      include: {
        question: {
          include: {
            trainingSets: {
              include: {
                trainingSet: {
                  include: { category: true },
                },
              },
            },
          },
        },
      },
    });

    const latestItemsWithTrainingSets = keepLatestItemsByQuestionId(
      sessionItemsWithTrainingSets,
      (item) => item.questionId,
      (item) => item.sessionItemId
    );

    const result = await prisma.$transaction(async (tx) => {
      const updatedCategories: Array<{ sessionCategoryId: number }> = [];

      for (const cat of existingCategories) {
        const items = latestItemsWithTrainingSets.filter((item) =>
          item.question.trainingSets.some((relation) => relation.setId === cat.setId)
        );

        if (items.length === 0) continue;

        const totalScore = items.reduce((sum, item) => sum + Number(item.score), 0);
        const avgResponseTime = items.reduce((sum, item) => sum + Number(item.responseTime), 0) / items.length;
        const totalHints = items.reduce((sum, item) => sum + (item.hintsUsed ?? 0), 0);
        const avgHintUsed = totalHints / items.length;

        const updated = await tx.sessionCategoryResult.update({
          where: { sessionCategoryId: cat.sessionCategoryId },
          data: {
            totalScore,
            averageResponseTime: avgResponseTime,
            averageHintUsed: avgHintUsed,
            endedAt: new Date(),
          },
        });

        updatedCategories.push(updated);
      }

      if (body.dailyPlanScheduleId) {
        await tx.dailyPlanSchedule.update({
          where: {
            dailyPlanScheduleId: body.dailyPlanScheduleId,
            patientId: sessionResult.patientId,
          },
          data: {
            status: 'COMPLETED',
            sessionId,
          },
        });
      }

      let progressTracking = await tx.progressTracking.findFirst({
        where: { patientId: sessionResult.patientId },
        orderBy: { lastUpdate: 'desc' },
      });

      if (!progressTracking) {
        progressTracking = await tx.progressTracking.create({
          data: {
            patientId: sessionResult.patientId,
            lastUpdate: new Date(),
          },
        });
      } else {
        progressTracking = await tx.progressTracking.update({
          where: { progressTrackingId: progressTracking.progressTrackingId },
          data: { lastUpdate: new Date() },
        });
      }

      for (const cat of existingCategories) {
        const ts = await tx.trainingSet.findUnique({
          where: { setId: cat.setId },
          select: { categoryId: true },
        });

        if (!ts) continue;

        const catItems = latestItemsWithTrainingSets.filter((item) =>
          item.question.trainingSets.some((relation) => relation.setId === cat.setId)
        );
        if (catItems.length === 0) continue;

        const catTotalScore = catItems.reduce((sum, item) => sum + Number(item.score), 0);
        const catScorePercent = (catTotalScore / catItems.length) * 100;
        const catTotalHints = catItems.reduce((sum, item) => sum + (item.hintsUsed ?? 0), 0);
        const catAvgHint = catTotalHints / catItems.length;
        const catTotalResponse = catItems.reduce((sum, item) => sum + Number(item.responseTime), 0);
        const catAvgResponse = catTotalResponse / catItems.length;

        const existingProgCat = await tx.progressCategory.findUnique({
          where: {
            progressTrackingId_categoryId: {
              progressTrackingId: progressTracking.progressTrackingId,
              categoryId: ts.categoryId,
            },
          },
        });

        if (existingProgCat) {
          const oldAvg = existingProgCat.averageScorePercentage ?? 0;
          const newAvg = (oldAvg + catScorePercent) / 2;

          await tx.progressCategory.update({
            where: {
              progressTrackingId_categoryId: {
                progressTrackingId: progressTracking.progressTrackingId,
                categoryId: ts.categoryId,
              },
            },
            data: {
              averageScorePercentage: newAvg,
              latestScorePercent: catScorePercent,
              averageHintUsed: ((existingProgCat.averageHintUsed ?? 0) + catAvgHint) / 2,
              averageResponseTime: ((existingProgCat.averageResponseTime ?? 0) + catAvgResponse) / 2,
              trend: catScorePercent - (existingProgCat.latestScorePercent ?? catScorePercent),
            },
          });
        } else {
          await tx.progressCategory.create({
            data: {
              progressTrackingId: progressTracking.progressTrackingId,
              categoryId: ts.categoryId,
              averageScorePercentage: catScorePercent,
              latestScorePercent: catScorePercent,
              averageHintUsed: catAvgHint,
              averageResponseTime: catAvgResponse,
              trend: 0,
            },
          });
        }
      }

      return {
        sessionId,
        patientId: sessionResult.patientId,
        categories: updatedCategories,
      };
    });

    return NextResponse.json(
      {
        message: 'Session completed successfully.',
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to complete session:', error);
    return NextResponse.json(
      { error: 'Unable to complete session.' },
      { status: 500 }
    );
  }
}