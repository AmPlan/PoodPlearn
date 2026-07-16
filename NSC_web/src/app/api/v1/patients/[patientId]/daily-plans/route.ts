import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type DailyPlanContext = {
  params: { patientId: string } | Promise<{ patientId: string }>;
};

export async function GET(req: NextRequest, context: DailyPlanContext) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const params = await context.params;
    const patientId = Number(params.patientId);

    if (!Number.isInteger(patientId) || patientId <= 0) {
      return NextResponse.json({ error: 'Invalid patientId.' }, { status: 400 });
    }

    if (session.role !== 'THERAPIST' && session.patientId !== patientId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    targetDate.setHours(0, 0, 0, 0);

    const schedules = await prisma.dailyPlanSchedule.findMany({
      where: {
        patientId,
        scheduledDate: targetDate,
      },
      include: {
        trainingPlan: {
          include: {
            category: true,
            difficultyLevel: true,
          },
        },
        sessionResult: {
          include: {
            sessionCategoryResult: {
              include: {
                trainingSet: true,
              },
            },
          },
        },
      },
      orderBy: {
        trainingPlan: {
          planRole: 'asc',
        },
      },
    });

    const enriched = await Promise.all(
      schedules.map(async (schedule) => {
        const trainingSets = await prisma.trainingSet.findMany({
          where: {
            categoryId: schedule.trainingPlan.categoryId,
            difficultyId: schedule.trainingPlan.difficultyId,
            deletedAt: null,
          },
        });

        const setIds = trainingSets.map((ts) => ts.setId);

        const setQuestions = await prisma.trainingSetQuestion.findMany({
          where: { setId: { in: setIds } },
          include: {
            trainingSet: {
              select: {
                setId: true,
                title: true,
              },
            },
            question: {
              include: {
                namingQuestions: true,
                comprehensionImageQuestions: true,
                ComprehensionQuestion: true,
                repetitionQuestions: true,
                spontaneousQuestions: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        });

        return {
          dailyPlanScheduleId: schedule.dailyPlanScheduleId,
          status: schedule.status,
          scheduledDate: schedule.scheduledDate,
          sessionId: schedule.sessionId,
          trainingPlan: {
            trainingPlanId: schedule.trainingPlan.trainingPlanId,
            planRole: schedule.trainingPlan.planRole,
            category: schedule.trainingPlan.category,
            difficultyLevel: schedule.trainingPlan.difficultyLevel,
          },
          sessionResult: schedule.sessionResult,
          trainingSets: trainingSets.map((ts) => ({
            setId: ts.setId,
            title: ts.title,
          })),
          questions: setQuestions.map((sq) => ({
            questionId: sq.question.questionId,
            questionType: sq.question.questionType,
            difficultyId: sq.question.difficultyId,
            orderIndex: sq.orderIndex,
            setId: sq.trainingSet.setId,
            setTitle: sq.trainingSet.title,
            detail: getQuestionDetail(sq.question),
          })),
        };
      })
    );

    return NextResponse.json({ data: enriched }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch daily plans:', error);
    return NextResponse.json(
      { error: 'Unable to fetch daily plans.' },
      { status: 500 }
    );
  }
}

function getQuestionDetail(question: {
  namingQuestions: any[];
  comprehensionImageQuestions: any[];
  ComprehensionQuestion: any[];
  repetitionQuestions: any[];
  spontaneousQuestions: any[];
}) {
  if (question.namingQuestions?.length > 0) {
    const q = question.namingQuestions[0];
    return {
      type: 'NAMING',
      correctAnswer: q.correctAnswer,
      correctAnswerVoiceUrl: q.correctAnswerVoiceUrl,
      imageUrl: q.imageUrl,
      hint1Text: q.hint1Text,
      hint1VoiceUrl: q.hint1VoiceUrl,
      hint2Text: q.hint2Text,
      hint2VoiceUrl: q.hint2VoiceUrl,
    };
  }

  if (question.comprehensionImageQuestions?.length > 0) {
    const q = question.comprehensionImageQuestions[0];
    return {
      type: 'COMPREHENSION_IMAGE',
      questionText: q.questionText,
      questionVoiceUrl: q.questionVoiceUrl,
      correctImageUrl: q.correctImageUrl,
      wrongImageUrl1: q.wrongImageUrl1,
      wrongImageUrl2: q.wrongImageUrl2,
    };
  }

  if (question.ComprehensionQuestion?.length > 0) {
    const q = question.ComprehensionQuestion[0];
    return {
      type: 'COMPREHENSION',
      questionText: q.questionText,
      questionVoiceUrl: q.questionVoiceUrl,
      correctAnswer: q.correctAnswer,
      customCondition: q.customCondition,
    };
  }

  if (question.repetitionQuestions?.length > 0) {
    const q = question.repetitionQuestions[0];
    return {
      type: 'REPETITION',
      text: q.text,
      textVoiceUrl: q.textVoiceUrl,
    };
  }

  if (question.spontaneousQuestions?.length > 0) {
    const q = question.spontaneousQuestions[0];
    return {
      type: 'SPONTANEOUS',
      questionText: q.questionText,
      questionVoiceUrl: q.questionVoiceUrl,
      correctAnswer: q.correctAnswer,
      correctAnswerVoiceUrl: q.correctAnswerVoiceUrl,
      customCondition: q.customCondition,
    };
  }

  return null;
}

type GenerateDailyTrainingPlanBody = {
  date?: string;
};

type HistoryEntry = {
  sessionId: number;
  categoryId: number;
  categoryName: string;
  difficultyId: number;
  difficultyLevel: number;
  difficultyName: string;
  totalScore: number;
  averageResponseTime: number;
  averageHintUsed: number;
  questionCount: number;
  scorePercent: number;
  endedAt: Date;
};

type CategorySummary = {
  categoryId: number;
  categoryName: string;
  averageScorePercent: number;
  averageResponseTime: number;
  averageHintUsed: number;
  latestScorePercent: number;
  trend: number;
  sessionCount: number;
  priorityScore: number;
};

type AvailableTrainingSet = {
  setId: number;
  categoryId: number;
  difficultyId: number;
  category: {
    categoryId: number;
    categoryName: string;
  };
  difficultyLevel: {
    difficultyId: number;
    difficultyLevel: number;
    difficultyName: string;
  };
  setQuestions: Array<{ questionId: number }>;
};

type CategoryCandidate = CategorySummary;

type GeneratedDailyPlan = {
  scheduledDate: Date;
  planRole: 'MAIN' | 'SECONDARY';
  trainingPlan: {
    trainingPlanId: number;
    categoryId: number;
    difficultyId: number;
    planRole: string;
    category: {
      categoryId: number;
      categoryName: string;
    };
    difficultyLevel: {
      difficultyId: number;
      difficultyLevel: number;
      difficultyName: string;
    };
  };
  dailyPlanSchedule: {
    dailyPlanScheduleId: number;
    status: string;
  };
};

const REVIEW_PLAN_DAYS = 30;
const REVIEW_PLAN_STATUS = 'IN_REVIEW';

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return startOfDay(date);
}

function average(values: number[]) {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculatePriorityScore(
  avgScore: number,
  latestScore: number,
  avgHint: number,
  avgTime: number,
  trend: number
): number {
  let score = 0;

  if (avgScore < 50) score += 3;
  else if (avgScore <= 80) score += 2;

  if (latestScore < 50) score += 2;
  else if (latestScore <= 80) score += 1;

  if (avgHint >= 2) score += 2;
  else if (avgHint > 0) score += 1;

  if (avgTime > 15) score += 1;

  if (trend < -5) score += 2;
  else if (trend <= 5) score += 1;

  return score;
}

function buildHistoryEntries(items: Array<{
  sessionId: number;
  totalScore: unknown;
  averageResponseTime: unknown;
  averageHintUsed: unknown;
  endedAt: Date | null;
  trainingSet: {
    categoryId: number;
    difficultyId: number;
    category: { categoryName: string };
    difficultyLevel: { difficultyLevel: number; difficultyName: string };
    setQuestions: Array<{ questionId: number }>;
  };
}>): HistoryEntry[] {
  return items
    .filter((item) => item.endedAt !== null)
    .map((item) => {
      const questionCount = item.trainingSet.setQuestions.length;
      const totalScore = Number(item.totalScore);
      const averageResponseTime = Number(item.averageResponseTime);
      const averageHintUsed = Number(item.averageHintUsed);

      return {
        sessionId: item.sessionId,
        categoryId: item.trainingSet.categoryId,
        categoryName: item.trainingSet.category.categoryName,
        difficultyId: item.trainingSet.difficultyId,
        difficultyLevel: item.trainingSet.difficultyLevel.difficultyLevel,
        difficultyName: item.trainingSet.difficultyLevel.difficultyName,
        totalScore,
        averageResponseTime,
        averageHintUsed,
        questionCount,
        scorePercent: questionCount > 0 ? (totalScore / questionCount) * 100 : 0,
        endedAt: item.endedAt as Date,
      };
    });
}

function summarizeCategories(historyEntries: HistoryEntry[]) {
  const summaries = new Map<number, any>();

  for (const entry of historyEntries) {
    const summary = summaries.get(entry.categoryId) ?? {
      categoryId: entry.categoryId,
      categoryName: entry.categoryName,
      averageScorePercent: 0,
      averageResponseTime: 0,
      averageHintUsed: 0,
      latestScorePercent: entry.scorePercent,
      trend: 0,
      sessionCount: 0,
      scoreValues: [],
      timeValues: [],
      hintValues: [],
    };

    summary.scoreValues.push(entry.scorePercent);
    summary.timeValues.push(entry.averageResponseTime);
    summary.hintValues.push(entry.averageHintUsed);
    summary.latestScorePercent = summary.sessionCount === 0 ? entry.scorePercent : summary.latestScorePercent;
    summary.sessionCount += 1;

    summaries.set(entry.categoryId, summary);
  }

  return [...summaries.values()].map((summary) => {
    const latestScores = summary.scoreValues.slice(0, 3);
    const previousScores = summary.scoreValues.slice(1, 4);
    const averageScorePercent = average(summary.scoreValues);
    const averageResponseTime = average(summary.timeValues);
    const averageHintUsed = average(summary.hintValues);
    const trend = latestScores.length > 1 ? latestScores[0] - average(previousScores) : 0;
    const priorityScore = calculatePriorityScore(
      averageScorePercent,
      summary.latestScorePercent,
      averageHintUsed,
      averageResponseTime,
      trend
    );

    return {
      categoryId: summary.categoryId,
      categoryName: summary.categoryName,
      averageScorePercent,
      averageResponseTime,
      averageHintUsed,
      latestScorePercent: summary.latestScorePercent,
      trend,
      sessionCount: summary.sessionCount,
      priorityScore,
    };
  });
}

function pickDifficultyLevel(
  currentDifficultyLevel: number,
  latestScorePercent: number,
  difficultyLevels: Array<{ difficultyId: number; difficultyLevel: number; difficultyName: string }>
) {
  const sorted = [...difficultyLevels].sort((left, right) => left.difficultyLevel - right.difficultyLevel);
  const currentIndex = sorted.findIndex((difficulty) => difficulty.difficultyLevel === currentDifficultyLevel);
  const current = currentIndex >= 0 ? sorted[currentIndex] : sorted[0] ?? null;

  if (!current) {
    return null;
  }

  if (latestScorePercent < 50 && currentIndex > 0) {
    return sorted[currentIndex - 1];
  }

  return current;
}

function chooseCategory(
  categorySummaries: CategorySummary[],
  recommendedDifficultyId: number,
  availableTrainingSets: AvailableTrainingSet[]
) {
  const candidates = buildCategoryCandidates(categorySummaries, recommendedDifficultyId, availableTrainingSets);

  return candidates[0] ?? null;
}

function buildCategoryCandidates(
  categorySummaries: CategorySummary[],
  recommendedDifficultyId: number,
  availableTrainingSets: AvailableTrainingSet[]
) {
  const categorySource =
    categorySummaries.length > 0
      ? categorySummaries
      : [...new Map(availableTrainingSets.map((trainingSet) => [trainingSet.categoryId, trainingSet])).values()].map(
          (trainingSet) => ({
            categoryId: trainingSet.categoryId,
            categoryName: trainingSet.category.categoryName,
            averageScorePercent: 0,
            averageResponseTime: 0,
            averageHintUsed: 0,
            latestScorePercent: 0,
            trend: 0,
            sessionCount: 0,
            priorityScore: 0,
          })
        );

  const categoriesWithDifficulty = new Map<number, CategoryCandidate>();

  for (const summary of categorySource) {
    const hasSet = availableTrainingSets.some(
      (trainingSet) => trainingSet.categoryId === summary.categoryId && trainingSet.difficultyId === recommendedDifficultyId
    );

    if (hasSet) {
      categoriesWithDifficulty.set(summary.categoryId, summary);
    }
  }

  const candidates = [...categoriesWithDifficulty.values()];

  if (candidates.length === 0) {
    const fallbackSet = availableTrainingSets.find((trainingSet) => trainingSet.difficultyId === recommendedDifficultyId)
      ?? availableTrainingSets[0];

    if (!fallbackSet) {
      return [];
    }

    return [
      {
        categoryId: fallbackSet.categoryId,
        categoryName: fallbackSet.category.categoryName,
        averageScorePercent: 0,
        averageResponseTime: 0,
        averageHintUsed: 0,
        latestScorePercent: 0,
        trend: 0,
        sessionCount: 0,
        priorityScore: 0,
      },
    ];
  }

  return candidates.sort((left, right) => {
    if (right.priorityScore !== left.priorityScore) {
      return right.priorityScore - left.priorityScore;
    }

    if (left.averageScorePercent !== right.averageScorePercent) {
      return left.averageScorePercent - right.averageScorePercent;
    }

    if (left.averageHintUsed !== right.averageHintUsed) {
      return right.averageHintUsed - left.averageHintUsed;
    }

    if (left.trend !== right.trend) {
      return left.trend - right.trend;
    }

    return 0;
  });
}

export async function POST(req: NextRequest, context: DailyPlanContext) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const params = await context.params;
    const patientId = Number(params.patientId);

    if (!Number.isInteger(patientId) || patientId <= 0) {
      return NextResponse.json({ error: 'Invalid patientId.' }, { status: 400 });
    }

    if (session.role !== 'THERAPIST' && session.patientId !== patientId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const patient = await prisma.patient.findUnique({
      where: { patientId },
    });

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
        where: {
          sessionResult: {
            patientId,
          },
          endedAt: {
            not: null,
          },
        },
        include: {
          trainingSet: {
            include: {
              category: true,
              difficultyLevel: true,
              setQuestions: {
                select: {
                  questionId: true,
                },
              },
            },
          },
        },
        orderBy: {
          endedAt: 'desc',
        },
        take: 20,
      }),
      prisma.trainingSet.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          category: true,
          difficultyLevel: true,
          setQuestions: {
            select: {
              questionId: true,
            },
          },
        },
      }),
      prisma.difficultyLevel.findMany({
        orderBy: {
          difficultyLevel: 'asc',
        },
      }),
    ]);

    const historyEntries = buildHistoryEntries(historyResults);
    const categorySummaries = summarizeCategories(historyEntries);

    if (availableTrainingSets.length === 0 || difficultyLevels.length === 0) {
      return NextResponse.json({ error: 'No training content is available.' }, { status: 404 });
    }

    const overallScorePercent = average(historyEntries.slice(0, 3).map((entry) => entry.scorePercent));
    const latestHistory = historyEntries[0] ?? null;

    const latestDifficulty = latestHistory
      ? difficultyLevels.find((difficulty) => difficulty.difficultyId === latestHistory.difficultyId) ?? difficultyLevels[0]
      : difficultyLevels[0];

    const recommendedDifficulty = pickDifficultyLevel(
      latestDifficulty.difficultyLevel,
      overallScorePercent,
      difficultyLevels
    );

    if (!recommendedDifficulty) {
      return NextResponse.json({ error: 'Unable to determine difficulty level.' }, { status: 500 });
    }

    const categoryCandidates = buildCategoryCandidates(
      categorySummaries.length > 0
        ? categorySummaries
        : availableTrainingSets.map((trainingSet) => ({
            categoryId: trainingSet.categoryId,
            categoryName: trainingSet.category.categoryName,
            averageScorePercent: 0,
            averageResponseTime: 0,
            averageHintUsed: 0,
            latestScorePercent: 0,
            trend: 0,
            sessionCount: 0,
            priorityScore: 0,
          })),
      recommendedDifficulty.difficultyId,
      availableTrainingSets
    );

    if (categoryCandidates.length === 0) {
      return NextResponse.json({ error: 'Unable to determine category.' }, { status: 500 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const reviewWindowEnd = addDays(targetDate, REVIEW_PLAN_DAYS);

      const existingReviewSchedules = await tx.dailyPlanSchedule.findMany({
        where: {
          patientId,
          scheduledDate: {
            gte: targetDate,
            lt: reviewWindowEnd,
          },
          status: {
            in: ['PENDING', REVIEW_PLAN_STATUS],
          },
        },
        select: {
          dailyPlanScheduleId: true,
          trainingPlanId: true,
        },
      });

      if (existingReviewSchedules.length > 0) {
        await tx.dailyPlanSchedule.deleteMany({
          where: {
            dailyPlanScheduleId: {
              in: existingReviewSchedules.map((schedule) => schedule.dailyPlanScheduleId),
            },
          },
        });

        await tx.trainingPlan.deleteMany({
          where: {
            trainingPlanId: {
              in: existingReviewSchedules.map((schedule) => schedule.trainingPlanId),
            },
          },
        });
      }

      const pairCount = Math.max(1, Math.ceil(categoryCandidates.length / 2));
      const generatedSchedules: GeneratedDailyPlan[] = [];

      for (let dayIndex = 0; dayIndex < REVIEW_PLAN_DAYS; dayIndex += 1) {
        const scheduledDate = addDays(targetDate, dayIndex);
        const pairIndex = dayIndex % pairCount;
        const mainCategory = categoryCandidates[pairIndex] ?? categoryCandidates[0];
        const secondaryCategory = categoryCandidates[categoryCandidates.length - 1 - pairIndex] ?? mainCategory;

        for (const slot of [
          { planRole: 'MAIN' as const, category: mainCategory },
          { planRole: 'SECONDARY' as const, category: secondaryCategory },
        ]) {
          const trainingPlan = await tx.trainingPlan.create({
            data: {
              patientId,
              categoryId: slot.category.categoryId,
              difficultyId: recommendedDifficulty.difficultyId,
              planRole: slot.planRole,
            },
            include: {
              category: true,
              difficultyLevel: true,
            },
          });

          const dailyPlanSchedule = await tx.dailyPlanSchedule.create({
            data: {
              patientId,
              trainingPlanId: trainingPlan.trainingPlanId,
              scheduledDate,
              status: REVIEW_PLAN_STATUS,
            },
          });

          generatedSchedules.push({
            scheduledDate,
            planRole: slot.planRole,
            trainingPlan,
            dailyPlanSchedule: {
              dailyPlanScheduleId: dailyPlanSchedule.dailyPlanScheduleId,
              status: dailyPlanSchedule.status,
            },
          });
        }
      }

      return {
        recommendation: {
          overallScorePercent,
          priorityScore: categoryCandidates[0].priorityScore,
        },
        topCategories: categoryCandidates.slice(0, 2).map((category) => ({
          categoryId: category.categoryId,
          categoryName: category.categoryName,
          priorityScore: category.priorityScore,
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
    });

    return NextResponse.json(
      {
        message: 'Daily training plan generated successfully.',
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to generate daily training plan:', error);

    return NextResponse.json(
      { error: 'Unable to generate daily training plan.' },
      { status: 500 }
    );
  }
}
