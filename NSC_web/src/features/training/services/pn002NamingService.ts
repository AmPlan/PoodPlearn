import { getBaseUrl } from "@/lib/baseUrl";
import type {
  NamingCategory,
  NamingQuestion,
  NamingResponse,
  NamingSessionState,
  NamingSessionSummary,
  NamingSet,
  TrainingModule,
  TrainingServiceResult,
} from "../types/pn002Naming.types";

type TrainingSetApiQuestion = {
  questionId: number;
  orderIndex: number;
  question: {
    questionId: number;
    questionType: string;
    namingQuestions?: Array<{
      correctAnswer?: string | null;
      correctAnswerVoiceUrl?: string | null;
      questionVoiceUrl?: string | null;
      imageUrl?: string | null;
      hint1VoiceUrl?: string | null;
      hint2VoiceUrl?: string | null;
      hint1Text?: string | null;
      hint2Text?: string | null;
    }>;
  };
};

type TrainingSetApiResponse = {
  setId: number;
  title?: string;
  setQuestions?: TrainingSetApiQuestion[];
  error?: string; // Added to handle error payloads
};

export interface SessionData {
  sessionItemId: number;
  sessionCategoryId: number;
  questionId: number;
  asrText: string;
  hintsUsed: number;
  score: string;
  responseTime: string;
  correctness: string;
  createdAt: string;
  answerImageUrl?: string | null;
  answerBoolean?: boolean | null;
}

export interface SessionResponse {
  message: string;
  isCorrect: boolean;
  score: number;
  correctness: number;
  data?: SessionData;
  error?: string;
}

type SessionApiResponse = {
  message?: string;
  error?: string;
  data?: {
    sessionId?: number; // Kept for compatibility if the POST response is flat
    patientId?: number;
    sessionResult?: {
      sessionId: number;
      patientId: number;
      sessionCategoryResult?: {
        sessionCategoryId: number;
        sessionId: number;
        setId: number;
        startedAt?: string;
      };
    };
  };
};

type SessionItemApiResponse = {
  message?: string;
  isCorrect?: boolean;
  score?: number;
  correctness?: number;
  data?: unknown;
  error?: string; // Added to handle error payloads
};

type NamingSessionCategoryApiResult = {
  sessionCategoryId: number;
  sessionId: number;
  setId: number;
  totalScore: number;
  averageResponseTime: number;
  averageHintUsed: number;
  startedAt: string;
  endedAt: string | null;
};

type CompleteNamingSessionApiResponse = {
  message?: string;
  error?: string;
  data?: {
    sessionId?: number;
    patientId?: number;
    categories?: NamingSessionCategoryApiResult[];
  };
};

export type CompleteNamingSessionResult = {
  sessionId: string;
  patientId: string;
  categories: NamingSessionCategoryApiResult[];
};

function createSuccess<T>(data: T): TrainingServiceResult<T> {
  return { success: true, data };
}

function createFailure<T>(errorMessage: string): TrainingServiceResult<T> {
  return { success: false, errorMessage };
}


function toNamingSet(payload: TrainingSetApiResponse): NamingSet {
  const questions = (payload.setQuestions ?? []).map((item, index) => {
    const namingDetail = item.question.namingQuestions?.[0];
    const answer = namingDetail?.correctAnswer ?? "";

    return {
      id: `${item.question.questionId}`,
      moduleId: "PN002",
      categoryId: "animals",
      categoryName: "สัตว์",
      internalLevel: "easy",
      setId: `${payload.setId}`,
      order: item.orderIndex ?? (index + 1),
      label: answer,
      promptText: "ภาพนี้คืออะไร",
      answer,
      acceptableAnswers: [answer],
      imageSrc: namingDetail?.imageUrl ?? undefined,
      questionAudioSrc: namingDetail?.questionVoiceUrl ?? undefined,
      hints: [
        ...(namingDetail?.hint1Text ? [{ level: 1 as const, type: "feature" as const, text: namingDetail.hint1Text, audioSrc: namingDetail?.hint1VoiceUrl }] : []),
        ...(namingDetail?.hint2Text ? [{ level: 2 as const, type: "initial_sound" as const, text: namingDetail.hint2Text, audioSrc: namingDetail?.hint2VoiceUrl }] : []),
        ...(answer ? [{ level: 3 as const, type: "answer" as const, text: answer, audioSrc: namingDetail?.correctAnswerVoiceUrl }] : []),

      ],
    } satisfies NamingQuestion;
  });

  return {
    id: `${payload.setId}`,
    moduleId: "PN002",
    categoryId: "animals",
    categoryName: "สัตว์",
    title: payload.title ?? `ชุดฝึก ${payload.setId}`,
    totalQuestions: questions.length,
    internalLevel: "easy",
    questions,
  };
}

export async function getPn002NamingModule(): Promise<TrainingServiceResult<TrainingModule>> {
  return createSuccess({
    id: "PN002",
    title: "แบบฝึกเรียกชื่อภาพ",
    subtitle: "ฝึกเรียกชื่อภาพจากคำถามและเสียง",
    categories: [
      {
        id: "animals",
        moduleId: "PN002",
        name: "สัตว์",
        title: "สัตว์",
        description: "ฝึกเรียกชื่อสัตว์จากภาพ",
        totalSets: 1,
        totalQuestions: 0,
        sets: [],
      },
    ],
  });
}

export async function getNamingCategories(): Promise<TrainingServiceResult<NamingCategory[]>> {
  return createSuccess([
    {
      id: "animals",
      moduleId: "PN002",
      name: "สัตว์",
      title: "สัตว์",
      description: "ฝึกเรียกชื่อสัตว์จากภาพ",
      totalSets: 1,
      totalQuestions: 0,
      sets: [],
    },
  ]);
}

export async function getNamingAnimalSets(): Promise<TrainingServiceResult<NamingSet[]>> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/training-sets`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    // Here we still use a union because it returns an Array on success, but an Object on error.
    // Array.isArray acts as a perfect TypeScript type-guard.
    const payload = (await response.json().catch(() => null)) as Array<TrainingSetApiResponse> | { error?: string } | null;

    if (!response.ok || !Array.isArray(payload)) {
      const errorMsg = payload && !Array.isArray(payload) && payload.error ? payload.error : "ไม่สามารถโหลดชุดแบบฝึกได้";
      return createFailure(errorMsg);
    }

    return createSuccess(payload.filter((item) => item.setId).map((item) => toNamingSet(item)));
  } catch (error) {
    return createFailure(error instanceof Error ? error.message : "ไม่สามารถโหลดชุดแบบฝึกได้");
  }
}

export async function getNamingSetById(setId: string): Promise<TrainingServiceResult<NamingSet>> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/training-sets/${setId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as TrainingSetApiResponse | null;

    if (!response.ok || !payload || payload.error) {
      return createFailure(payload?.error ?? "ไม่พบชุดแบบฝึก");
    }

    return createSuccess(toNamingSet(payload));
  } catch (error) {
    return createFailure(error instanceof Error ? error.message : "ไม่พบชุดแบบฝึก");
  }
}

export async function getNamingQuestionById(questionId: string): Promise<TrainingServiceResult<NamingQuestion>> {
  return createFailure("ไม่รองรับการโหลดคำถามเดี่ยวในตอนนี้");
}

export function getSavedNamingResponsesForPatient(_patientId: string) {
  return [] as Array<{
    response: {
      responseId: string;
      submittedAt: string;
      mockAnswer?: string | null;
      skipped: boolean;
      isCorrect: boolean;
      hintLevelUsed?: number | null;
    };
    question?: {
      answer?: string;
    };
  }>;
}

export async function createMockNamingSession(setId: NamingSet["id"], patientId: number): Promise<TrainingServiceResult<NamingSessionState>> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, setId: Number(setId) }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as SessionApiResponse | null;

    if (!response.ok || !payload || payload.error) {
      return createFailure(payload?.error ?? "ไม่สามารถเริ่มเซสชันฝึกได้");
    }
    if (!payload.data?.sessionId) {
      return createFailure("ไม่สามารถเริ่มเซสชันฝึกได้ - ข้อมูล Session ไม่ครบถ้วน");
    }

    return createSuccess({
      sessionId: `${payload.data.sessionId}`,
      patientId: `${patientId}`,
      moduleId: "PN002",
      categoryId: "animals",
      setId,
      startedAt: new Date().toISOString(),
      currentQuestionIndex: 0,
      totalQuestions: 0,
      responses: [],
    });
  } catch (error) {
    return createFailure(error instanceof Error ? error.message : "ไม่สามารถเริ่มเซสชันฝึกได้");
  }
}

export async function getMockNamingSessionById(sessionId: string): Promise<TrainingServiceResult<NamingSessionState>> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/sessions/${sessionId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as SessionApiResponse | null;

    // Safely extract the session data, handling both nested (GET) and flat (POST) structures
    const sessionData = payload?.data?.sessionResult;

    if (!response.ok || !payload || payload.error || !sessionData?.sessionId) {
      return createFailure(payload?.error ?? "ไม่พบข้อมูล session");
    }

    // Extract setId safely if it exists in the nested category result
    const extractedSetId = sessionData.sessionCategoryResult?.setId
      ? String(sessionData.sessionCategoryResult.setId)
      : "";

    return createSuccess({
      sessionId: `${sessionData.sessionId}`,
      patientId: `${sessionData.patientId ?? ""}`,
      moduleId: "PN002",
      categoryId: "animals",
      setId: extractedSetId,
      startedAt: sessionData.sessionCategoryResult?.startedAt ?? new Date().toISOString(),
      currentQuestionIndex: 0,
      totalQuestions: 0,
      responses: [],
    });
  } catch (error) {
    return createFailure(error instanceof Error ? error.message : "ไม่พบข้อมูล session");
  }
}

export async function submitMockNamingAnswer(
  response: Omit<NamingResponse, "responseId" | "submittedAt">
): Promise<TrainingServiceResult<SessionResponse>> {
  try {
    const baseUrl = getBaseUrl();
    const formData = new FormData();
    formData.append("questionId", String(response.questionId));
    formData.append("responseTime", String(Math.max(0, (response.responseTimeMs || 0) / 1000)));
    formData.append("hintsUsed", String(response.hintLevelUsed));

    if (response.voiceFile) {
      formData.append("voiceFile", response.voiceFile);
    }
    else if (response.answerText) {
      formData.append("answerText", response.answerText);
    }

    const responseResult = await fetch(`${baseUrl}/api/v1/sessions/${response.sessionId}/items`, {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    const payload = (await responseResult.json().catch(() => null)) as SessionResponse | null;

    // Add a check for !payload to ensure you don't pass null to createSuccess
    if (!responseResult.ok || !payload) {
      return createFailure(payload?.error ?? "ไม่สามารถบันทึกคำตอบได้");
    }

    // Return the parsed JSON payload, not the raw fetch response
    return createSuccess(payload);
  } catch (error) {
    return createFailure(error instanceof Error ? error.message : "ไม่สามารถบันทึกคำตอบได้");
  }
}

/**
 * Calls POST /api/v1/sessions/[id]/complete to finalize a naming training
 * session (GET is intentionally not used here). This finishes the session's
 * category results on the backend, marks the related daily plan schedule as
 * completed, and updates progress tracking.
 */
export async function completeNamingSession(
  sessionId: string
): Promise<TrainingServiceResult<CompleteNamingSessionResult>> {
  try {
    const numericSessionId = Number(sessionId);

    if (!Number.isInteger(numericSessionId) || numericSessionId <= 0) {
      return createFailure("รหัสเซสชันไม่ถูกต้องสำหรับจบการฝึก");
    }

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/sessions/${numericSessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as CompleteNamingSessionApiResponse | null;

    if (!response.ok || !payload || payload.error || !payload.data?.sessionId || !payload.data?.patientId) {
      return createFailure(payload?.error ?? "ไม่สามารถจบเซสชันฝึกได้");
    }

    return createSuccess({
      sessionId: `${payload.data.sessionId}`,
      patientId: `${payload.data.patientId}`,
      categories: payload.data.categories ?? [],
    });
  } catch (error) {
    return createFailure(error instanceof Error ? error.message : "ไม่สามารถจบเซสชันฝึกได้");
  }
}

export async function getMockNamingSessionSummary(sessionId: string): Promise<TrainingServiceResult<NamingSessionSummary>> {
  const completeResult = await completeNamingSession(sessionId);

  if (!completeResult.success) {
    return createFailure(completeResult.errorMessage);
  }

  const { categories } = completeResult.data;
  const namingCategory = categories[0];

  return createSuccess({
    sessionId,
    setId: namingCategory ? `${namingCategory.setId}` : "",
    categoryName: "สัตว์",
    completedQuestions: 0,
    totalQuestions: 0,
    correctCount: 0,
    skippedCount: 0,
    wordsToReview: [],
    completedAt: namingCategory?.endedAt ?? new Date().toISOString(),
  });
}