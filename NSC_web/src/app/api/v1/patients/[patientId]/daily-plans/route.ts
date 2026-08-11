import { NextRequest, NextResponse } from 'next/server';
import { authorizePatientAccess, parsePatientId } from '@/lib/daily-plan/api-auth';
import { average, startOfDay } from '@/lib/daily-plan/date-utils';
import { regenerateReviewSchedule } from '@/lib/daily-plan/generate';
import {
  buildCategoryCandidates,
  buildHistoryEntries,
  pickDifficultyLevel,
  REVIEW_PLAN_DAYS,
  summarizeCategories,
} from '@/lib/daily-plan/recommendation';
import { buildEnrichedSchedule } from '@/lib/daily-plan/serialize';
import { prisma } from '@/lib/prisma';

type DailyPlanContext = {
  params: { patientId: string } | Promise<{ patientId: string }>;
};

type GenerateDailyTrainingPlanBody = { date?: string };

/** Resolves the patientId from the route params and checks the caller may access it. */
async function resolveAuthorizedPatient(
  context: DailyPlanContext
): Promise<{ patientId: number } | { error: NextResponse }> {
  const params = await context.params;
  const patientId = parsePatientId(params.patientId);

  if (patientId === null) {
    return { error: NextResponse.json({ error: 'Invalid patientId.' }, { status: 400 }) };
  }

  const auth = await authorizePatientAccess(patientId);
  if (!auth.ok) {
    return { error: auth.response };
  }

  return { patientId };
}

export async function GET(req: NextRequest, context: DailyPlanContext) {
  try {
    const resolved = await resolveAuthorizedPatient(context);
    if ('error' in resolved) return resolved.error;
    const { patientId } = resolved;

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const targetDate = startOfDay(dateParam ? new Date(dateParam) : new Date());

    const schedules = await prisma.dailyPlanSchedule.findMany({
      where: { patientId, scheduledDate: targetDate },
      include: {
        trainingPlan: { include: { category: true, difficultyLevel: true } },
        sessionResult: {
          include: { sessionCategoryResult: { include: { trainingSet: true } } },
        },
      },
      orderBy: { trainingPlan: { planRole: 'asc' } },
    });

    const enriched = await Promise.all(schedules.map(buildEnrichedSchedule));

    return NextResponse.json({ data: enriched }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch daily plans:', error);
    return NextResponse.json({ error: 'Unable to fetch daily plans.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: DailyPlanContext) {
  try {
    const resolved = await resolveAuthorizedPatient(context);
    if ('error' in resolved) return resolved.error;
    const { patientId } = resolved;

    const patient = await prisma.patient.findUnique({ where: { patientId } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as GenerateDailyTrainingPlanBody;
    const targetDate = startOfDay(body.date ? new Date(body.date) : new Date());

    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date.' }, { status: 400 });
    }

    const [historyResults, availableTrainingSets, difficultyLevels] = await Promise.all([
      prisma.sessionCategoryResult.findMany({
        where: { sessionResult: { patientId }, endedAt: { not: null } },
        include: {
          trainingSet: {
            include: {
              category: true,
              difficultyLevel: true,
              setQuestions: { select: { questionId: true } },
            },
          },
        },
        orderBy: { endedAt: 'desc' },
        take: 20,
      }),
      prisma.trainingSet.findMany({
        where: { deletedAt: null },
        include: {
          category: true,
          difficultyLevel: true,
          setQuestions: { select: { questionId: true } },
        },
      }),
      prisma.difficultyLevel.findMany({ orderBy: { difficultyLevel: 'asc' } }),
    ]);

    if (availableTrainingSets.length === 0 || difficultyLevels.length === 0) {
      return NextResponse.json({ error: 'No training content is available.' }, { status: 404 });
    }

    const historyEntries = buildHistoryEntries(historyResults);
    const categorySummaries = summarizeCategories(historyEntries);
    const overallScorePercent = average(historyEntries.slice(0, 3).map((e) => e.scorePercent));
    const latestHistory = historyEntries[0] ?? null;

    const latestDifficulty = latestHistory
      ? difficultyLevels.find((d) => d.difficultyId === latestHistory.difficultyId) ?? difficultyLevels[0]
      : difficultyLevels[0];

    const recommendedDifficulty = pickDifficultyLevel(
      latestDifficulty.difficultyLevel,
      overallScorePercent,
      difficultyLevels
    );

    if (!recommendedDifficulty) {
      return NextResponse.json({ error: 'Unable to determine difficulty level.' }, { status: 500 });
    }

    // buildCategoryCandidates already falls back to un-summarized categories
    // when the patient has no history yet, so categorySummaries is passed as-is.
    const categoryCandidates = buildCategoryCandidates(
      categorySummaries,
      recommendedDifficulty.difficultyId,
      availableTrainingSets
    );

    if (categoryCandidates.length === 0) {
      return NextResponse.json({ error: 'Unable to determine category.' }, { status: 500 });
    }

    const generatedSchedules = await prisma.$transaction((tx) =>
      regenerateReviewSchedule(tx, {
        patientId,
        targetDate,
        categoryCandidates,
        recommendedDifficultyId: recommendedDifficulty.difficultyId,
      })
    );

    const result = {
      recommendation: {
        overallScorePercent,
        priorityScore: categoryCandidates[0].priorityScore,
      },
      topCategories: categoryCandidates.slice(0, 2).map((c) => ({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        priorityScore: c.priorityScore,
      })),
      recommendedDifficulty: {
        difficultyId: recommendedDifficulty.difficultyId,
        difficultyLevel: recommendedDifficulty.difficultyLevel,
        difficultyName: recommendedDifficulty.difficultyName,
      },
      reviewWindowDays: REVIEW_PLAN_DAYS,
      generatedScheduleCount: generatedSchedules.length,
      generatedSchedules,
    };

    return NextResponse.json(
      { message: 'Daily training plan generated successfully.', data: result },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to generate daily training plan:', error);
    return NextResponse.json({ error: 'Unable to generate daily training plan.' }, { status: 500 });
  }
}