import type {
  CategoryScore,
  ProgressBySession,
} from "../types/therapistClinical.types";

export type ProgressCategoryKey =
  | "overview"
  | "spontaneous"
  | "comprehension"
  | "repetition"
  | "naming";

export type ProgressTimeRangeKey = "7d" | "30d" | "3m" | "all";

export type ProgressCategoryOption = {
  key: ProgressCategoryKey;
  label: string;
  scoreCategory?: string;
  color: string;
};

export type ProgressTimeRangeOption = {
  key: ProgressTimeRangeKey;
  label: string;
};

export type PatientProgressFilters = {
  categoryKey: ProgressCategoryKey;
  timeRangeKey: ProgressTimeRangeKey;
};

export type PatientProgressPoint = {
  id: string;
  sessionNumber: number;
  date: string;
  categoryKey: ProgressCategoryKey;
  categoryLabel: string;
  score: number | null;
  maxScore: number | null;
  percent: number | null;
  displayScore: string;
};

export type PatientProgressSummary = {
  sessionCount: number;
  firstPoint?: PatientProgressPoint;
  latestPoint?: PatientProgressPoint;
  averagePercent: number | null;
  latestDate?: string;
  latestCategoryLabel?: string;
};

export type ProgressCategoryAggregate = {
  key: Exclude<ProgressCategoryKey, "overview">;
  label: string;
  score: number;
  maxScore: number;
  percent: number | null;
};

export type PatientProgressInsights = {
  changeText?: string;
  bestCategoryText?: string;
  latestSessionText?: string;
  watchCategoryText?: string;
  emptyReason?: string;
};

export const progressCategoryOptions: ProgressCategoryOption[] = [
  {
    key: "overview",
    label: "ภาพรวม",
    color: "#0F756F",
  },
  {
    key: "spontaneous",
    label: "พูดตอบ",
    scoreCategory: "Spontaneous",
    color: "#2F80ED",
  },
  {
    key: "comprehension",
    label: "ความเข้าใจ",
    scoreCategory: "Comprehension",
    color: "#8A5D12",
  },
  {
    key: "repetition",
    label: "พูดตาม",
    scoreCategory: "Words repetition",
    color: "#725AC1",
  },
  {
    key: "naming",
    label: "เรียกชื่อภาพ",
    scoreCategory: "Naming",
    color: "#B42318",
  },
];

export const progressTimeRangeOptions: ProgressTimeRangeOption[] = [
  { key: "7d", label: "7 วัน" },
  { key: "30d", label: "30 วัน" },
  { key: "3m", label: "3 เดือน" },
  { key: "all", label: "ตั้งแต่เริ่มฝึก" },
];

const scoreKeys = progressCategoryOptions.filter(
  (option): option is ProgressCategoryOption & {
    key: Exclude<ProgressCategoryKey, "overview">;
    scoreCategory: string;
  } => option.key !== "overview" && Boolean(option.scoreCategory),
);

export function getProgressCategoryLabel(key: ProgressCategoryKey) {
  return (
    progressCategoryOptions.find((option) => option.key === key)?.label ??
    "ภาพรวม"
  );
}

export function getProgressTimeRangeLabel(key: ProgressTimeRangeKey) {
  return (
    progressTimeRangeOptions.find((option) => option.key === key)?.label ??
    "ตั้งแต่เริ่มฝึก"
  );
}

function getScoreDefinition(scores: CategoryScore[], scoreCategory: string) {
  return scores.find((score) => score.category === scoreCategory);
}

function toPercent(score: number | null, maxScore: number | null) {
  if (score === null || maxScore === null || maxScore <= 0) return null;
  return Math.round((score / maxScore) * 100);
}

function formatScore(score: number | null, maxScore: number | null) {
  if (score === null || maxScore === null) return "—";
  return `${score}/${maxScore} ข้อ`;
}

function parseSessionDate(date: string) {
  const timestamp = new Date(`${date}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getDateThreshold(
  sortedSessions: ProgressBySession[],
  timeRangeKey: ProgressTimeRangeKey,
) {
  if (timeRangeKey === "all" || sortedSessions.length === 0) {
    return null;
  }

  const latestTimestamp = parseSessionDate(
    sortedSessions[sortedSessions.length - 1]?.date ?? "",
  );

  if (latestTimestamp === null) return null;

  const days =
    timeRangeKey === "7d" ? 7 : timeRangeKey === "30d" ? 30 : 92;
  return latestTimestamp - (days - 1) * 24 * 60 * 60 * 1000;
}

function sortSessionsByDate(progress: ProgressBySession[]) {
  return [...progress].sort((a, b) => {
    const aTime = parseSessionDate(a.date) ?? 0;
    const bTime = parseSessionDate(b.date) ?? 0;
    return aTime - bTime;
  });
}

function getFilteredSessions(
  progress: ProgressBySession[],
  filters: PatientProgressFilters,
) {
  const sortedSessions = sortSessionsByDate(progress);
  const threshold = getDateThreshold(sortedSessions, filters.timeRangeKey);

  if (threshold === null) {
    return sortedSessions;
  }

  return sortedSessions.filter((session) => {
    const timestamp = parseSessionDate(session.date);
    return timestamp !== null && timestamp >= threshold;
  });
}

function mapSessionToPoint(
  session: ProgressBySession,
  sessionIndex: number,
  scores: CategoryScore[],
  categoryKey: ProgressCategoryKey,
): PatientProgressPoint {
  const category = progressCategoryOptions.find(
    (option) => option.key === categoryKey,
  );

  if (!category || category.key === "overview") {
    const totals = scoreKeys.reduce(
      (summary, scoreKey) => {
        const scoreDefinition = getScoreDefinition(
          scores,
          scoreKey.scoreCategory,
        );
        const maxScore = scoreDefinition?.maxScore ?? null;
        const rawScore = session[scoreKey.key];

        if (maxScore && maxScore > 0 && typeof rawScore === "number") {
          return {
            score: summary.score + rawScore,
            maxScore: summary.maxScore + maxScore,
          };
        }

        return summary;
      },
      { score: 0, maxScore: 0 },
    );
    const score = totals.maxScore > 0 ? totals.score : null;
    const maxScore = totals.maxScore > 0 ? totals.maxScore : null;

    return {
      id: `${session.date}-${sessionIndex}-overview`,
      sessionNumber: sessionIndex + 1,
      date: session.date,
      categoryKey: "overview",
      categoryLabel: "ภาพรวม",
      score,
      maxScore,
      percent: toPercent(score, maxScore),
      displayScore: formatScore(score, maxScore),
    };
  }

  const scoreDefinition = category.scoreCategory
    ? getScoreDefinition(scores, category.scoreCategory)
    : undefined;
  const score =
    typeof session[category.key] === "number" ? session[category.key] : null;
  const maxScore = scoreDefinition?.maxScore ?? null;

  return {
    id: `${session.date}-${sessionIndex}-${category.key}`,
    sessionNumber: sessionIndex + 1,
    date: session.date,
    categoryKey: category.key,
    categoryLabel: category.label,
    score,
    maxScore,
    percent: toPercent(score, maxScore),
    displayScore: formatScore(score, maxScore),
  };
}

export function getFilteredProgressPoints(
  progress: ProgressBySession[] | null | undefined,
  scores: CategoryScore[] | null | undefined,
  filters: PatientProgressFilters,
) {
  const safeProgress = Array.isArray(progress) ? progress : [];
  const safeScores = Array.isArray(scores) ? scores : [];

  return getFilteredSessions(safeProgress, filters).map((session, index) =>
    mapSessionToPoint(session, index, safeScores, filters.categoryKey),
  );
}

export function getProgressSummary(
  points: PatientProgressPoint[],
): PatientProgressSummary {
  const validPoints = points.filter((point) => point.percent !== null);
  const latestPoint = validPoints[validPoints.length - 1];
  const averagePercent =
    validPoints.length > 0
      ? Math.round(
          validPoints.reduce((sum, point) => sum + (point.percent ?? 0), 0) /
            validPoints.length,
        )
      : null;

  return {
    sessionCount: validPoints.length,
    firstPoint: validPoints[0],
    latestPoint,
    averagePercent,
    latestDate: latestPoint?.date,
    latestCategoryLabel: latestPoint?.categoryLabel,
  };
}

export function getCategoryAggregates(
  progress: ProgressBySession[] | null | undefined,
  scores: CategoryScore[] | null | undefined,
  filters: PatientProgressFilters,
): ProgressCategoryAggregate[] {
  const safeProgress = Array.isArray(progress) ? progress : [];
  const safeScores = Array.isArray(scores) ? scores : [];
  const filteredSessions = getFilteredSessions(safeProgress, filters);

  return scoreKeys.map((category) => {
    const scoreDefinition = getScoreDefinition(safeScores, category.scoreCategory);
    const maxScorePerSession = scoreDefinition?.maxScore ?? 0;
    const score = filteredSessions.reduce(
      (sum, session) => sum + session[category.key],
      0,
    );
    const maxScore = maxScorePerSession * filteredSessions.length;

    return {
      key: category.key,
      label: category.label,
      score,
      maxScore,
      percent: toPercent(score, maxScore),
    };
  });
}

export function getProgressInsights({
  aggregates,
  filters,
  points,
}: {
  aggregates: ProgressCategoryAggregate[];
  filters: PatientProgressFilters;
  points: PatientProgressPoint[];
}): PatientProgressInsights {
  const summary = getProgressSummary(points);

  if (points.length === 0) {
    return {
      emptyReason:
        filters.timeRangeKey === "all"
          ? "ยังไม่มีข้อมูลการฝึกที่บันทึกไว้"
          : "ไม่มีข้อมูลในช่วงเวลาหรือหมวดที่เลือก",
    };
  }

  const first = summary.firstPoint;
  const latest = summary.latestPoint;
  const change =
    first?.score !== null &&
    first?.score !== undefined &&
    latest?.score !== null &&
    latest?.score !== undefined
      ? latest.score - first.score
      : null;

  const changeText =
    !first || !latest
      ? undefined
      : points.length === 1
        ? `มีข้อมูลการฝึก 1 ครั้งล่าสุด คะแนน ${latest.displayScore} จึงยังไม่สรุปแนวโน้ม`
        : change === null
          ? undefined
          : change > 0
            ? `คะแนนเพิ่มขึ้นจาก ${first.displayScore} ในการฝึกครั้งแรก เป็น ${latest.displayScore} ในการฝึกล่าสุด เพิ่มขึ้น ${change} ข้อ`
            : change < 0
              ? `คะแนนลดลงจาก ${first.displayScore} ในการฝึกครั้งแรก เป็น ${latest.displayScore} ในการฝึกล่าสุด ลดลง ${Math.abs(change)} ข้อ`
              : `คะแนนคงที่ที่ ${latest.displayScore} จากข้อมูลการฝึกที่บันทึกไว้`;

  const validAggregates = aggregates.filter(
    (aggregate) => aggregate.percent !== null && aggregate.maxScore > 0,
  );
  const bestCategory = [...validAggregates].sort(
    (a, b) => (b.percent ?? 0) - (a.percent ?? 0),
  )[0];
  const watchCategory = [...validAggregates].sort(
    (a, b) => (a.percent ?? 0) - (b.percent ?? 0),
  )[0];

  return {
    changeText,
    bestCategoryText: bestCategory
      ? `หมวดที่ทำได้ดีที่สุดคือ ${bestCategory.label} (${bestCategory.score}/${bestCategory.maxScore} ข้อ, ${bestCategory.percent}%)`
      : undefined,
    latestSessionText: latest
      ? `การฝึกล่าสุด: ${latest.categoryLabel} วันที่ ${formatDisplayDate(latest.date)} คะแนน ${latest.displayScore}`
      : undefined,
    watchCategoryText: watchCategory
      ? `จากข้อมูลการฝึกที่บันทึกไว้ ควรติดตามหมวด ${watchCategory.label} ซึ่งมีค่าเฉลี่ย ${watchCategory.percent}%`
      : undefined,
  };
}

export function formatDisplayDate(date: string | null | undefined) {
  if (!date) return "—";

  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

export function formatPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${value}%` : "—";
}
