import { average } from './date-utils';

export const REVIEW_PLAN_DAYS = 30;
export const REVIEW_PLAN_STATUS = 'IN_REVIEW';

export type HistoryEntry = {
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

export type CategorySummary = {
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

export type AvailableTrainingSet = {
  setId: number;
  categoryId: number;
  difficultyId: number;
  category: { categoryId: number; categoryName: string };
  difficultyLevel: { difficultyId: number; difficultyLevel: number; difficultyName: string };
  setQuestions: Array<{ questionId: number }>;
};

export type CategoryCandidate = CategorySummary;

export type GeneratedDailyPlan = {
  scheduledDate: Date;
  planRole: 'MAIN' | 'SECONDARY';
  trainingPlan: {
    trainingPlanId: number;
    categoryId: number;
    difficultyId: number;
    planRole: string;
    category: { categoryId: number; categoryName: string };
    difficultyLevel: { difficultyId: number; difficultyLevel: number; difficultyName: string };
  };
  dailyPlanSchedule: { dailyPlanScheduleId: number; status: string };
};

type RawHistoryItem = {
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
};

/** Weighted score used to rank categories by how urgently they need practice. */
export function calculatePriorityScore(
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

export function buildHistoryEntries(items: RawHistoryItem[]): HistoryEntry[] {
  return items
    .filter((item): item is RawHistoryItem & { endedAt: Date } => item.endedAt !== null)
    .map((item) => {
      const questionCount = item.trainingSet.setQuestions.length;
      const totalScore = Number(item.totalScore);

      return {
        sessionId: item.sessionId,
        categoryId: item.trainingSet.categoryId,
        categoryName: item.trainingSet.category.categoryName,
        difficultyId: item.trainingSet.difficultyId,
        difficultyLevel: item.trainingSet.difficultyLevel.difficultyLevel,
        difficultyName: item.trainingSet.difficultyLevel.difficultyName,
        totalScore,
        averageResponseTime: Number(item.averageResponseTime),
        averageHintUsed: Number(item.averageHintUsed),
        questionCount,
        scorePercent: questionCount > 0 ? (totalScore / questionCount) * 100 : 0,
        endedAt: item.endedAt,
      };
    });
}

type CategoryAccumulator = {
  categoryId: number;
  categoryName: string;
  latestScorePercent: number;
  sessionCount: number;
  scoreValues: number[];
  timeValues: number[];
  hintValues: number[];
};

export function summarizeCategories(historyEntries: HistoryEntry[]): CategorySummary[] {
  const accumulators = new Map<number, CategoryAccumulator>();

  for (const entry of historyEntries) {
    const acc = accumulators.get(entry.categoryId) ?? {
      categoryId: entry.categoryId,
      categoryName: entry.categoryName,
      latestScorePercent: entry.scorePercent,
      sessionCount: 0,
      scoreValues: [],
      timeValues: [],
      hintValues: [],
    };

    acc.scoreValues.push(entry.scorePercent);
    acc.timeValues.push(entry.averageResponseTime);
    acc.hintValues.push(entry.averageHintUsed);
    acc.sessionCount += 1;

    accumulators.set(entry.categoryId, acc);
  }

  return [...accumulators.values()].map((acc) => {
    const latestScores = acc.scoreValues.slice(0, 3);
    const previousScores = acc.scoreValues.slice(1, 4);
    const averageScorePercent = average(acc.scoreValues);
    const averageResponseTime = average(acc.timeValues);
    const averageHintUsed = average(acc.hintValues);
    const trend = latestScores.length > 1 ? latestScores[0] - average(previousScores) : 0;

    return {
      categoryId: acc.categoryId,
      categoryName: acc.categoryName,
      averageScorePercent,
      averageResponseTime,
      averageHintUsed,
      latestScorePercent: acc.latestScorePercent,
      trend,
      sessionCount: acc.sessionCount,
      priorityScore: calculatePriorityScore(
        averageScorePercent,
        acc.latestScorePercent,
        averageHintUsed,
        averageResponseTime,
        trend
      ),
    };
  });
}

/** Steps the patient down one difficulty level if their recent scores are poor. */
export function pickDifficultyLevel(
  currentDifficultyLevel: number,
  latestScorePercent: number,
  difficultyLevels: Array<{ difficultyId: number; difficultyLevel: number; difficultyName: string }>
) {
  const sorted = [...difficultyLevels].sort((a, b) => a.difficultyLevel - b.difficultyLevel);
  const currentIndex = sorted.findIndex((d) => d.difficultyLevel === currentDifficultyLevel);
  const current = currentIndex >= 0 ? sorted[currentIndex] : sorted[0] ?? null;

  if (!current) return null;

  if (latestScorePercent < 50 && currentIndex > 0) {
    return sorted[currentIndex - 1];
  }

  return current;
}

function toFallbackCandidate(trainingSet: AvailableTrainingSet): CategoryCandidate {
  return {
    categoryId: trainingSet.categoryId,
    categoryName: trainingSet.category.categoryName,
    averageScorePercent: 0,
    averageResponseTime: 0,
    averageHintUsed: 0,
    latestScorePercent: 0,
    trend: 0,
    sessionCount: 0,
    priorityScore: 0,
  };
}

/**
 * Ranks categories that have training content at the recommended difficulty,
 * highest priority first. Falls back to any available training set if none
 * of the summarized categories has content at that difficulty (e.g. a
 * first-time patient with no history yet).
 */
export function buildCategoryCandidates(
  categorySummaries: CategorySummary[],
  recommendedDifficultyId: number,
  availableTrainingSets: AvailableTrainingSet[]
): CategoryCandidate[] {
  const categorySource =
    categorySummaries.length > 0
      ? categorySummaries
      : [...new Map(availableTrainingSets.map((ts) => [ts.categoryId, ts])).values()].map(
          toFallbackCandidate
        );

  const categoriesWithDifficulty = new Map<number, CategoryCandidate>();

  for (const summary of categorySource) {
    const hasSet = availableTrainingSets.some(
      (ts) => ts.categoryId === summary.categoryId && ts.difficultyId === recommendedDifficultyId
    );
    if (hasSet) {
      categoriesWithDifficulty.set(summary.categoryId, summary);
    }
  }

  const candidates = [...categoriesWithDifficulty.values()];

  if (candidates.length === 0) {
    const fallbackSet =
      availableTrainingSets.find((ts) => ts.difficultyId === recommendedDifficultyId) ??
      availableTrainingSets[0];

    return fallbackSet ? [toFallbackCandidate(fallbackSet)] : [];
  }

  return candidates.sort((left, right) => {
    if (right.priorityScore !== left.priorityScore) return right.priorityScore - left.priorityScore;
    if (left.averageScorePercent !== right.averageScorePercent) {
      return left.averageScorePercent - right.averageScorePercent;
    }
    if (left.averageHintUsed !== right.averageHintUsed) return right.averageHintUsed - left.averageHintUsed;
    if (left.trend !== right.trend) return left.trend - right.trend;
    return 0;
  });
}