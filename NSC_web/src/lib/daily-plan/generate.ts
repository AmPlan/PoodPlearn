import type { Prisma } from '../prisma';

import { addDays } from './date-utils';
import {
  type CategoryCandidate,
  type GeneratedDailyPlan,
  REVIEW_PLAN_DAYS,
  REVIEW_PLAN_STATUS,
} from './recommendation';

type GenerateParams = {
  patientId: number;
  targetDate: Date;
  categoryCandidates: CategoryCandidate[];
  recommendedDifficultyId: number;
};

/**
 * Replaces any pending/in-review schedules in the upcoming review window with
 * a fresh MAIN + SECONDARY pair for each day, alternating through the ranked
 * category candidates.
 */
export async function regenerateReviewSchedule(
  tx: Prisma.TransactionClient,
  { patientId, targetDate, categoryCandidates, recommendedDifficultyId }: GenerateParams
): Promise<GeneratedDailyPlan[]> {
  const reviewWindowEnd = addDays(targetDate, REVIEW_PLAN_DAYS);

  const existingSchedules = await tx.dailyPlanSchedule.findMany({
    where: {
      patientId,
      scheduledDate: { gte: targetDate, lt: reviewWindowEnd },
      status: { in: ['PENDING', REVIEW_PLAN_STATUS] },
    },
    select: { dailyPlanScheduleId: true, trainingPlanId: true },
  });

  if (existingSchedules.length > 0) {
    await tx.dailyPlanSchedule.deleteMany({
      where: { dailyPlanScheduleId: { in: existingSchedules.map((s) => s.dailyPlanScheduleId) } },
    });
    await tx.trainingPlan.deleteMany({
      where: { trainingPlanId: { in: existingSchedules.map((s) => s.trainingPlanId) } },
    });
  }

  const pairCount = Math.max(1, Math.ceil(categoryCandidates.length / 2));
  const generatedSchedules: GeneratedDailyPlan[] = [];

  for (let dayIndex = 0; dayIndex < REVIEW_PLAN_DAYS; dayIndex += 1) {
    const scheduledDate = addDays(targetDate, dayIndex);
    const pairIndex = dayIndex % pairCount;
    const mainCategory = categoryCandidates[pairIndex] ?? categoryCandidates[0];
    const secondaryCategory =
      categoryCandidates[categoryCandidates.length - 1 - pairIndex] ?? mainCategory;

    const slots: Array<{ planRole: 'MAIN' | 'SECONDARY'; category: CategoryCandidate }> = [
      { planRole: 'MAIN', category: mainCategory },
      { planRole: 'SECONDARY', category: secondaryCategory },
    ];

    for (const slot of slots) {
      const trainingSet = await tx.trainingSet.findFirst({
        where: {
          categoryId: slot.category.categoryId,
          difficultyId: recommendedDifficultyId,
          deletedAt: null,
        },
        include: { category: true, difficultyLevel: true },
        orderBy: { setId: 'asc' },
      });

      if (!trainingSet) {
        throw new Error('Unable to find a training set for the selected category and difficulty.');
      }

      const trainingPlan = await tx.trainingPlan.create({
        data: {
          patientId,
          trainingSetId: trainingSet.setId,
          planRole: slot.planRole,
        },
        include: { trainingSet: { include: { category: true, difficultyLevel: true } } },
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
        trainingPlan: {
          trainingPlanId: trainingPlan.trainingPlanId,
          categoryId: trainingSet.categoryId,
          difficultyId: trainingSet.difficultyId,
          planRole: trainingPlan.planRole,
          category: {
            categoryId: trainingSet.category.categoryId,
            categoryName: trainingSet.category.categoryName,
          },
          difficultyLevel: {
            difficultyId: trainingSet.difficultyId,
            difficultyLevel: trainingSet.difficultyLevel.difficultyLevel,
            difficultyName: trainingSet.difficultyLevel.difficultyName,
          },
        },
        dailyPlanSchedule: {
          dailyPlanScheduleId: dailyPlanSchedule.dailyPlanScheduleId,
          status: dailyPlanSchedule.status,
        },
      });
    }
  }

  return generatedSchedules;
}