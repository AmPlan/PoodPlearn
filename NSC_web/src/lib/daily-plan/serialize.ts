import { prisma } from '@/lib/prisma';

import { getQuestionDetail } from './question-detail';

/**
 * Loads the training sets and questions belonging to a scheduled plan's
 * category/difficulty pair, and flattens everything into one API-friendly object.
 */

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export  async function buildEnrichedSchedule(schedule: any) {
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
      category: schedule.trainingPlan.category,
      difficultyLevel: schedule.trainingPlan.difficultyLevel,
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