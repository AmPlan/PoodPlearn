import { prisma, Prisma } from '@/lib/prisma';

import { getQuestionDetail } from './question-detail';

/**
 * Loads the training sets and questions belonging to a scheduled plan's
 * category/difficulty pair, and flattens everything into one API-friendly object.
 */

type DailyPlanScheduleWithRelations = Prisma.DailyPlanScheduleGetPayload<{
  include: {
    trainingPlan: {
      include: {
        trainingSet: {
          include: {
            category: true;
            difficultyLevel: true;
          };
        };
      };
    };
    sessionResult: {
      include: {
        sessionCategoryResult: {
          include: {
            trainingSet: true;
          };
        };
      };
    };
  };
}>;

export async function buildEnrichedSchedule(schedule: DailyPlanScheduleWithRelations) {
  const trainingSetId = schedule.trainingPlan.trainingSetId;
  const trainingSet =
    schedule.trainingPlan.trainingSet ??
    (await prisma.trainingSet.findUnique({
      where: { setId: trainingSetId },
      include: { category: true, difficultyLevel: true },
    }));

  if (!trainingSet) {
    throw new Error('Unable to resolve training set for scheduled plan.');
  }

  const trainingSets = [trainingSet];
  const setIds = [trainingSet.setId];

  const setQuestions = await prisma.trainingSetQuestion.findMany({
    where: { setId: { in: setIds } },
    include: {
      trainingSet: { select: { setId: true, title: true } },
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
      trainingSet: {
        setId: trainingSet.setId,
        title: trainingSet.title,
        category: trainingSet.category,
        difficultyLevel: trainingSet.difficultyLevel,
      },
    },
    sessionResult: schedule.sessionResult,
    trainingSets: trainingSets.map((ts) => ({ setId: ts.setId, title: ts.title })),
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
}