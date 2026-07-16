import { getSavedNamingResponsesForPatient } from "@/features/training/services/pn002NamingService";
import type {
  CategoryScore,
  ProgressBySession,
  SessionResultItem,
} from "../types/therapistClinical.types";

type SessionApiResult = {
  sessionId?: number;
  sessionCategoryResult?: {
    totalScore?: number | string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    trainingSet?: {
      title?: string | null;
      categoryId?: number | null;
      category?: {
        categoryName?: string | null;
        name?: string | null;
      } | null;
    } | null;
  } | null;
};

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function mapCategoryNameToProgressKey(categoryName?: string | null) {
  const normalized = categoryName?.trim().toLowerCase() ?? "";

  switch (normalized) {
    case "spontaneous":
      return "spontaneous" as const;
    case "comprehension":
      return "comprehension" as const;
    case "words repetition":
    case "repetition":
      return "repetition" as const;
    case "naming":
      return "naming" as const;
    default:
      return null;
  }
}

function mapTrainingSetToProgressKey(session: SessionApiResult) {
  const categoryId = session.sessionCategoryResult?.trainingSet?.categoryId;
  const categoryName = session.sessionCategoryResult?.trainingSet?.category?.categoryName
    ?? session.sessionCategoryResult?.trainingSet?.category?.name;

  switch (categoryId) {
    case 1:
      return "naming" as const;
    case 2:
      return "repetition" as const;
    case 3:
      return "comprehension" as const;
    case 4:
      return "spontaneous" as const;
    default:
      return mapCategoryNameToProgressKey(categoryName);
  }
}

function mapProgressKeyToCategoryLabel(key: "spontaneous" | "comprehension" | "repetition" | "naming") {
  switch (key) {
    case "spontaneous":
      return "Spontaneous";
    case "comprehension":
      return "Comprehension";
    case "repetition":
      return "Words repetition";
    case "naming":
      return "Naming";
  }
}

const MAX_SCORE_BY_PROGRESS_KEY: Record<
  "spontaneous" | "comprehension" | "repetition" | "naming",
  number
> = {
  spontaneous: 10,
  comprehension: 10,
  repetition: 10,
  naming: 15,
};

function getMaxScoreForProgressKey(
  key: "spontaneous" | "comprehension" | "repetition" | "naming",
) {
  return MAX_SCORE_BY_PROGRESS_KEY[key] ?? 100;
}

function buildCategoryScores(sessions: SessionApiResult[]): CategoryScore[] {
  const latestScoreByKey = new Map<"spontaneous" | "comprehension" | "repetition" | "naming", number>();

  [...sessions]
    .filter((session) => session.sessionCategoryResult?.endedAt || session.sessionCategoryResult?.startedAt)
    .sort((left, right) => {
      const leftDate = left.sessionCategoryResult?.endedAt ?? left.sessionCategoryResult?.startedAt ?? "";
      const rightDate = right.sessionCategoryResult?.endedAt ?? right.sessionCategoryResult?.startedAt ?? "";
      return Date.parse(rightDate) - Date.parse(leftDate);
    })
    .forEach((session) => {
      const key = mapTrainingSetToProgressKey(session);
      const score = toNumber(session.sessionCategoryResult?.totalScore);

      if (key && score !== null && !latestScoreByKey.has(key)) {
        latestScoreByKey.set(key, score);
      }
    });

  return Array.from(latestScoreByKey.entries())
    .map(([key, score]) => ({
      category: mapProgressKeyToCategoryLabel(key),
      score,
      maxScore: getMaxScoreForProgressKey(key),
    }))
    .filter((item) => item.score > 0 || item.maxScore > 0);
}

function buildProgressBySession(sessions: SessionApiResult[]): ProgressBySession[] {
  const summaryByDate = new Map<string, ProgressBySession>();

  [...sessions]
    .filter((session) => session.sessionCategoryResult?.endedAt || session.sessionCategoryResult?.startedAt)
    .sort((left, right) => {
      const leftDate = left.sessionCategoryResult?.endedAt ?? left.sessionCategoryResult?.startedAt ?? "";
      const rightDate = right.sessionCategoryResult?.endedAt ?? right.sessionCategoryResult?.startedAt ?? "";
      return Date.parse(leftDate) - Date.parse(rightDate);
    })
    .forEach((session) => {
      const date = formatDate(session.sessionCategoryResult?.endedAt ?? session.sessionCategoryResult?.startedAt);
      if (!date) {
        return;
      }

      const current = summaryByDate.get(date) ?? {
        date,
        spontaneous: 0,
        comprehension: 0,
        repetition: 0,
        naming: 0,
      };

      const key = mapTrainingSetToProgressKey(session);
      const score = toNumber(session.sessionCategoryResult?.totalScore);

      if (key && score !== null) {
        current[key] = score;
      }

      summaryByDate.set(date, current);
    });

  return Array.from(summaryByDate.values());
}

async function getRequestHeaders() {
  const headers: HeadersInit = { "Content-Type": "application/json" };

  if (typeof window === "undefined") {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const cookieHeader = cookieStore.toString();

      if (cookieHeader) {
        headers.Cookie = cookieHeader;
      }
    } catch {
      // Ignore server-only cookie access failures and fall back to normal fetch behavior.
    }
  }

  return headers;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const headers = await getRequestHeaders();
    const response = await fetch(path, {
      method: "GET",
      headers,
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json().catch(() => null)) as T | null;
  } catch {
    return null;
  }
}

export async function getPatientClinicalOverview(patientId: string): Promise<{
  success: true;
  data: { categoryScores: CategoryScore[]; progressBySession: ProgressBySession[] };
} | { success: false; errorMessage: string }> {
  const numericPatientId = Number(patientId);
  const query = new URLSearchParams();

  if (Number.isInteger(numericPatientId) && numericPatientId > 0) {
    query.set("patientId", String(numericPatientId));
  }

  query.set("limit", "20");

  const payload = await fetchJson<{ data?: SessionApiResult[]; error?: string }>(
    `${getBaseUrl()}/api/v1/sessions?${query.toString()}`,
  );

  const sessions = Array.isArray(payload?.data) ? payload.data : [];

  return {
    success: true,
    data: {
      categoryScores: buildCategoryScores(sessions),
      progressBySession: buildProgressBySession(sessions),
    },
  };
}

export async function getPatientSessionResults(patientId: string): Promise<{
  success: true;
  data: SessionResultItem[];
} | { success: false; errorMessage: string }> {
  const savedTrainingResults: SessionResultItem[] =
    getSavedNamingResponsesForPatient(patientId).map(({ response, question }) => ({
      id: response.responseId,
      date: response.submittedAt.slice(0, 10),
      asrTranscript: response.mockAnswer ?? (response.skipped ? "ข้ามข้อนี้" : ""),
      expectedAnswer: question?.answer,
      aiCorrect: response.isCorrect,
      therapistReviewStatus: response.skipped ? "needs-review" : "not-reviewed",
      therapistNote: response.hintLevelUsed
        ? `ใช้คำใบ้ระดับ ${response.hintLevelUsed}`
        : "",
    }));

  const numericPatientId = Number(patientId);
  const query = new URLSearchParams();

  if (Number.isInteger(numericPatientId) && numericPatientId > 0) {
    query.set("patientId", String(numericPatientId));
  }

  query.set("limit", "50");

  const payload = await fetchJson<{ data?: SessionApiResult[]; error?: string }>(
    `${getBaseUrl()}/api/v1/sessions?${query.toString()}`,
  );

  const apiSessionResults: SessionResultItem[] = (Array.isArray(payload?.data) ? payload.data : []).map((session) => ({
    id: `session-${session.sessionId ?? "unknown"}`,
    date: formatDate(session.sessionCategoryResult?.endedAt ?? session.sessionCategoryResult?.startedAt),
    expectedAnswer: session.sessionCategoryResult?.trainingSet?.title ?? undefined,
    therapistReviewStatus: "not-reviewed",
  }));

  return { success: true, data: [...savedTrainingResults, ...apiSessionResults] };
}