import { NextRequest, NextResponse } from 'next/server';
import { authorizePatientAccess, parsePatientId } from '@/lib/daily-plan/api-auth';
import { startOfDay } from '@/lib/daily-plan/date-utils';
import { buildEnrichedSchedule } from '@/lib/daily-plan/serialize';
import { prisma } from '@/lib/prisma';
import { title } from 'process';

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

    console.log(targetDate);

    const schedules = await prisma.dailyPlanSchedule.findMany({
      where: { patientId, scheduledDate: targetDate },
      include: {
        trainingPlan: { include: { trainingSet: { include: { category: true, difficultyLevel: true } } } },
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

    const body = (await req.json().catch(() => ({}))) as GenerateDailyTrainingPlanBody;
    const targetDate = startOfDay(body.date ? new Date(body.date) : new Date());

    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date.' }, { status: 400 });
    }

    const namingCategory = await prisma.category.findFirst({
      where: { categoryName: { equals: 'Naming', mode: 'insensitive' } },
    });

    if (!namingCategory) {
      return NextResponse.json({ error: 'Naming category not found.' }, { status: 404 });
    }

    const latestNamingAssessment = await prisma.assessmentCategoryResult.findFirst({
      where: {
        assessmentResult: { patientId, endedAt: { not: null } },
        categoryId: namingCategory.categoryId,
      },
      orderBy: { assessmentResult: { startedAt: 'desc' } },
    });

    let difficultyId = latestNamingAssessment?.recommendedDifficultyId ?? null;

    let selectedTrainingSets = await prisma.trainingSet.findMany({
      where: {
        categoryId: namingCategory.categoryId,
        difficultyId: difficultyId ?? undefined,
        deletedAt: null,
      },
      include: { category: true, difficultyLevel: true },
      orderBy: { setId: 'asc' },
    });

    if (selectedTrainingSets.length === 0) {
      const fallbackTrainingSet = await prisma.trainingSet.findFirst({
        where: { categoryId: namingCategory.categoryId, deletedAt: null },
        include: { category: true, difficultyLevel: true },
        orderBy: { difficultyId: 'asc' },
      });

      if (!fallbackTrainingSet) {
        return NextResponse.json(
          { error: 'Unable to determine a difficulty level for Naming training.' },
          { status: 500 }
        );
      }

      difficultyId = fallbackTrainingSet.difficultyId;
      selectedTrainingSets = [fallbackTrainingSet];
    }

    const selectedCount = Math.min(selectedTrainingSets.length, 2);
    selectedTrainingSets = selectedTrainingSets.sort(() => Math.random() - 0.5).slice(0, selectedCount);

    const existingSchedules = await prisma.dailyPlanSchedule.findMany({
      where: {
        patientId,
        scheduledDate: targetDate,
        status: { in: ['PENDING', 'IN_REVIEW'] },
      },
      include: {
        trainingPlan: {
          include: {
            trainingSet: {
              select: {
                title: true
              }
            }
          }
        }
      },
      orderBy: { trainingPlan: { planRole: 'asc' } },
    });

    if (existingSchedules.length > 0) {
      const enriched = existingSchedules.map((schedule) => ({
        scheduledDate: schedule.scheduledDate,
        planRole: schedule.trainingPlan.planRole,
        trainingPlan: {
          trainingPlanTitle: schedule.trainingPlan.trainingSet.title,
          trainingPlanId: schedule.trainingPlan.trainingPlanId,
          trainingSetId: schedule.trainingPlan.trainingSetId,
        },
        dailyPlanSchedule: {
          dailyPlanScheduleId: schedule.dailyPlanScheduleId,
          status: schedule.status,
        },
      }));

      return NextResponse.json(
        {
          message: 'Daily training plan already exists for this date.',
          data: {
            category: {
              categoryId: namingCategory.categoryId,
              categoryName: namingCategory.categoryName,
            },
            difficultyId,
            existingScheduleCount: enriched.length,
            existingSchedules: enriched,
          },
        },
        { status: 201 }
      );
    }

    const planRoles = ['MAIN', 'SECONDARY'] as const;

    const generatedSchedules = await prisma.$transaction(async (tx) =>
      Promise.all(
        selectedTrainingSets.map(async (trainingSet, index) => {
          const planRole = planRoles[index] ?? 'SECONDARY';
          const trainingPlan = await tx.trainingPlan.create({
            data: {
              patientId,
              trainingSetId: trainingSet.setId,
              planRole,
            },
          });

          const dailyPlanSchedule = await tx.dailyPlanSchedule.create({
            data: {
              patientId,
              trainingPlanId: trainingPlan.trainingPlanId,
              scheduledDate: targetDate,
              status: 'PENDING',
            },
          });

          return {
            scheduledDate: targetDate,
            planRole,
            trainingPlan: {
              trainingPlanId: trainingPlan.trainingPlanId,
              trainingPlanTitle: trainingSet.title,
              trainingSetId: trainingPlan.trainingSetId,

            },
            dailyPlanSchedule: {
              dailyPlanScheduleId: dailyPlanSchedule.dailyPlanScheduleId,
              status: dailyPlanSchedule.status,
            },
          };
        })
      )
    );

    return NextResponse.json(
      {
        message: 'Daily training plan generated successfully.',
        data: {
          category: {
            categoryId: namingCategory.categoryId,
            categoryName: namingCategory.categoryName,
          },
          difficultyId,
          generatedScheduleCount: generatedSchedules.length,
          generatedSchedules,
        },
      },
      { status: 201 }
    );

    /*
    Old POST implementation preserved for future reference:

    const patient = await prisma.patient.findUnique({ where: { patientId } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
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
    */
  } catch (error) {
    console.error('Failed to generate daily training plan:', error);
    return NextResponse.json({ error: 'Unable to generate daily training plan.' }, { status: 500 });
  }
}