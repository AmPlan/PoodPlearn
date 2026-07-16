import { getAuthSession } from "@/features/auth/services/authSession";
import type {
  AssessmentAnswer,
  AssessmentHint,
  AssessmentServiceResult,
  QuestionCategory,
  QuestionInteractionType,
  SavedAssessmentAnswer,
  StandardAssessmentIntro,
  StandardAssessmentQuestion,
  StandardAssessmentResult,
  StandardAssessmentSession,
} from "../types/assessment.types";

type TrainingSetApiQuestion = {
  questionId: number;
  orderIndex: number;
  question: {
    questionId: number;
    questionType: string;
    namingQuestions?: Array<{
      correctAnswer?: string | null;
      questionVoiceUrl: string;
      imageUrl?: string | null;
      hint1Text?: string | null;
      hint2Text?: string | null;
    }>;
    comprehensionImageQuestions?: Array<{
      questionText?: string | null;
      questionVoiceUrl: string;
      correctImageUrl?: string | null;
      wrongImageUrl1?: string | null;
      wrongImageUrl2?: string | null;
    }>;
    ComprehensionQuestion?: Array<{
      questionText?: string | null;
      questionVoiceUrl: string;
      correctAnswer?: boolean | null;
      customCondition?: string | null;
    }>;
    repetitionQuestions?: Array<{
      text?: string | null;
      textVoiceUrl?: string | null;
    }>;
    spontaneousQuestions?: Array<{
      questionVoiceUrl: string;
      questionText?: string | null;
      correctAnswer?: string | null;
      correctAnswerVoiceUrl?: string | null;
      customCondition?: string | null;
    }>;
  };
};

type TrainingSetApiResponse = {
  setId: number;
  title?: string;
  setQuestions?: TrainingSetApiQuestion[];
};

type AssessmentApiResponse = {
  message?: string;
  data?: {
    assessment?: {
      assessmentResultId?: number;
      patientId?: number;
      setId?: number | null;
      endedAt?: string | null;
    };
    categoryResults?: Array<{
      categoryId?: number;
      totalScore?: number;
      maxScore?: number;
      recommendedDifficultyId?: number;
      category?: {
        categoryName?: string;
      };
    }>;
  };
};

let currentAssessmentId: number | null = null;
let currentAssessmentSetId: number | null = null;
let currentAssessmentQuestionCount = 0;

export const mockStandardAssessmentIntro: StandardAssessmentIntro = {
  title: "ทำแบบทดสอบก่อนใช้งาน",
  subtitle:
    "เริ่มทำแบบทดสอบก่อนใช้งานเพื่อให้ระบบวางแผนการฝึกที่เหมาะกับคุณ",
  infoItems: [
    `ทั้งหมด 30 ข้อ`,
    "ใช้เวลาประมาณ 10-15 นาที",
    "ตอบตามที่ทำได้ ไม่ต้องกังวล",
  ],
  startButtonText: "เริ่มทำแบบทดสอบก่อนใช้งาน",
  startFeedbackMessage: "เยี่ยมเลย เริ่มกันเลย!",
};


function clearAssessmentSession() {
  currentAssessmentId = null;
  currentAssessmentSetId = null;
  currentAssessmentQuestionCount = 0;
}

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function ensureAssessmentStarted(): Promise<{ assessmentId: number; setId: number | null }> {
  if (currentAssessmentId) {
    return { assessmentId: currentAssessmentId, setId: currentAssessmentSetId };
  }

  const session = getAuthSession();

  if (!session?.user?.patientId) {
    throw new Error("Patient session not available.");
  }

  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      patientId: session.user.patientId,
      setId: 2,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | AssessmentApiResponse
    | { error?: string }
    | null;

  const successPayload = payload as AssessmentApiResponse | null;
  const assessmentId = successPayload?.data?.assessment?.assessmentResultId;
  const setId = successPayload?.data?.assessment?.setId ?? null;

  if (!response.ok || !assessmentId) {
    throw new Error(
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : "ไม่สามารถเริ่มแบบทดสอบก่อนใช้งานได้",
    );
  }

  currentAssessmentId = assessmentId;
  currentAssessmentSetId = setId;
  return { assessmentId, setId };
}

function toQuestionCategory(questionType: string): QuestionCategory {
  switch (questionType.toUpperCase()) {
    case "NAMING":
      return "naming";
    case "COMPREHENSION":
    case "COMPREHENSION_IMAGE":
      return "comprehension";
    case "REPETITION":
      return "repetition";
    case "SPONTANEOUS":
      return "spontaneous";
    default:
      return "spontaneous";
  }
}

function toInteractionType(questionType: string): QuestionInteractionType {
  switch (questionType.toUpperCase()) {
    case "NAMING":
      return "name_image";
    case "COMPREHENSION_IMAGE":
      return "image_choice";
    case "COMPREHENSION":
      return "yes_no_choice";
    case "REPETITION":
      return "repeat_after";
    case "SPONTANEOUS":
      return "voice_question";
    default:
      return "voice_question";
  }
}

function getCategoryLabel(category: QuestionCategory) {
  switch (category) {
    case "naming":
      return "การเรียกชื่อ";
    case "comprehension":
      return "ความเข้าใจภาษา";
    case "repetition":
      return "พูดตาม";
    case "spontaneous":
    default:
      return "การพูดอิสระ";
  }
}

function buildQuestionFromApi(
  item: TrainingSetApiQuestion,
  index: number,
): StandardAssessmentQuestion {
  const questionType = item.question.questionType ?? "SPONTANEOUS";
  const category = toQuestionCategory(questionType);
  const interactionType = toInteractionType(questionType);
  const namingDetail = item.question.namingQuestions?.[0];
  const comprehensionImageDetail = item.question.comprehensionImageQuestions?.[0];
  const comprehensionDetail = item.question.ComprehensionQuestion?.[0];
  const repetitionDetail = item.question.repetitionQuestions?.[0];
  const spontaneousDetail = item.question.spontaneousQuestions?.[0];

  let promptText = "คำถาม";
  let expectedAnswer: string | undefined;
  let imageSrc: string | undefined;
  let questionAudioSrc: string | undefined;
  let choices: StandardAssessmentQuestion["choices"];
  let hints: AssessmentHint[] | undefined;

  switch (questionType.toUpperCase()) {
    case "NAMING": {
      promptText = "ภาพนี้คืออะไร";
      questionAudioSrc = "/training_sounds/Naming_Question.wav";
      expectedAnswer = namingDetail?.correctAnswer ?? undefined;
      imageSrc = namingDetail?.imageUrl ?? undefined;
      hints = [
        ...(namingDetail?.hint1Text
          ? [{ level: 1 as const, type: "feature" as const, text: namingDetail.hint1Text }]
          : []),
        ...(namingDetail?.hint2Text
          ? [{ level: 2 as const, type: "initial_sound" as const, text: namingDetail.hint2Text }]
          : []),
      ];
      break;
    }
    case "COMPREHENSION_IMAGE": {
      promptText = comprehensionImageDetail?.questionText ?? "เลือกภาพที่ตรงกับคำถาม";
      questionAudioSrc = comprehensionImageDetail?.questionVoiceUrl;
      expectedAnswer = comprehensionImageDetail?.questionText ?? undefined;
      choices = [
        ...(comprehensionImageDetail?.correctImageUrl
          ? [{ id: "correct", label: "ตัวเลือกที่ถูก", imageSrc: comprehensionImageDetail.correctImageUrl, isCorrect: true }]
          : []),
        ...(comprehensionImageDetail?.wrongImageUrl1
          ? [{ id: "wrong-1", label: "ตัวเลือกที่ไม่ถูก", imageSrc: comprehensionImageDetail.wrongImageUrl1, isCorrect: false }]
          : []),
        ...(comprehensionImageDetail?.wrongImageUrl2
          ? [{ id: "wrong-2", label: "ตัวเลือกที่ไม่ถูก", imageSrc: comprehensionImageDetail.wrongImageUrl2, isCorrect: false }]
          : []),
      ];
      break;
    }
    case "COMPREHENSION": {
      promptText = comprehensionDetail?.questionText ?? "ตอบคำถาม";
      questionAudioSrc = comprehensionDetail?.questionVoiceUrl;
      expectedAnswer = comprehensionDetail?.correctAnswer === true ? "ใช่" : comprehensionDetail?.correctAnswer === false ? "ไม่ใช่" : undefined;
      choices = [
        { id: "yes", label: "ใช่", isCorrect: comprehensionDetail?.correctAnswer === true },
        { id: "no", label: "ไม่ใช่", isCorrect: comprehensionDetail?.correctAnswer === false },
      ];
      hints = comprehensionDetail?.customCondition
        ? [{ level: 1 as const, type: "feature" as const, text: comprehensionDetail.customCondition }]
        : undefined;
      break;
    }
    case "REPETITION": {
      promptText = repetitionDetail?.text ?? "พูดตามคำพูด";
      expectedAnswer = repetitionDetail?.text ?? undefined;
      questionAudioSrc = repetitionDetail?.textVoiceUrl ?? undefined;
      hints = repetitionDetail?.textVoiceUrl
        ? [{ level: 1 as const, type: "slow_repetition" as const, text: "ฟังและพยายามพูดตามเสียงที่ให้ไว้" }]
        : undefined;
      break;
    }
    case "SPONTANEOUS": {
      promptText = spontaneousDetail?.questionText ?? "ตอบคำถาม";
      questionAudioSrc = spontaneousDetail?.questionVoiceUrl;
      expectedAnswer = spontaneousDetail?.correctAnswer ?? undefined;
      //questionAudioSrc = spontaneousDetail?.correctAnswerVoiceUrl ?? undefined;
      hints = spontaneousDetail?.customCondition
        ? [{ level: 1 as const, type: "feature" as const, text: spontaneousDetail.customCondition }]
        : undefined;
      break;
    }
    default: {
      promptText = "คำถาม";
      break;
    }
  }

  return {
    id: `${item.question.questionId ?? index + 1}`,
    order: item.orderIndex || index + 1,
    category,
    categoryLabel: getCategoryLabel(category),
    interactionType,
    promptText,
    expectedAnswer,
    imageSrc,
    questionAudioSrc,
    choices,
    hints,
  };
}

export async function getStandardAssessmentIntro(): Promise<
  AssessmentServiceResult<StandardAssessmentIntro>
> {
  try {
    await ensureAssessmentStarted();

    return {
      success: true,
      data: mockStandardAssessmentIntro,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "ไม่สามารถเริ่มแบบทดสอบก่อนใช้งานได้",
    };
  }
}

export async function getStandardAssessmentSession(): Promise<
  AssessmentServiceResult<StandardAssessmentSession>
> {
  try {
    const { assessmentId, setId } = await ensureAssessmentStarted();
    const baseUrl = getBaseUrl();
    const trainingSetId = setId ?? 2;

    const response = await fetch(`${baseUrl}/api/v1/training-sets/${trainingSetId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | TrainingSetApiResponse
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      return {
        success: false,
        errorMessage:
          payload && typeof payload === "object" && "error" in payload && payload.error
            ? payload.error
            : "ไม่สามารถโหลดคำถามแบบทดสอบก่อนใช้งานได้",
      };
    }

    const trainingSet = payload as TrainingSetApiResponse;
    const questions = (trainingSet.setQuestions ?? [])
      .map((item: TrainingSetApiQuestion, index: number) => buildQuestionFromApi(item, index))
      .sort((left: StandardAssessmentQuestion, right: StandardAssessmentQuestion) => left.order - right.order);

    currentAssessmentQuestionCount = questions.length;

    return {
      success: true,
      data: {
        sessionId: `assessment-${assessmentId}`,
        totalQuestions: questions.length,
        questions,
      },
    };
  } catch (error) {
    return {
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "ไม่สามารถโหลดคำถามแบบทดสอบก่อนใช้งานได้",
    };
  }
}

export async function saveStandardAssessmentAnswer(
  answer: AssessmentAnswer,
): Promise<AssessmentServiceResult<SavedAssessmentAnswer>> {
  try {
    const { assessmentId } = await ensureAssessmentStarted();

    if (!answer.questionId) {
      return {
        success: false,
        errorMessage: "ไม่พบคำถามสำหรับบันทึกคำตอบ",
      };
    }

    const questionId = Number(answer.questionId);

    if (!Number.isInteger(questionId) || questionId <= 0) {
      return {
        success: false,
        errorMessage: "คำถามไม่ถูกต้องสำหรับบันทึกคำตอบ",
      };
    }

    const baseUrl = getBaseUrl();
    const formData = new FormData();
    formData.append("questionId", String(questionId));
    formData.append(
      "responseTime",
      ((answer.responseTimeMs ?? 0) / 1000).toFixed(2)
    );

    if (answer.voiceFile) {
      const audioFile = answer.voiceFile instanceof File
        ? answer.voiceFile
        : new File([answer.voiceFile], `recording_${questionId}.wav`, {
            type: answer.voiceFile.type || "audio/wav",
          });

      formData.append("voiceFile", audioFile);
    }

    if (answer.answerBoolean !== undefined) {
      formData.append("answerBoolean", String(answer.answerBoolean));
    } else if (answer.answerType === "yes_no_choice") {
      if (answer.selectedOptionId === "yes") {
        formData.append("answerBoolean", "true");
      } else if (answer.selectedOptionId === "no") {
        formData.append("answerBoolean", "false");
      }
    }

    if (answer.answerImageUrl) {
      formData.append("answerImageUrl", answer.answerImageUrl);
    } else if (answer.answerType === "image_choice" && answer.selectedOptionId) {
      formData.append("answerImageUrl", answer.selectedOptionId);
    }

    const response = await fetch(`${baseUrl}/api/v1/assessments/${assessmentId}/items`, {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | { data?: unknown }
      | null;

    if (!response.ok) {
      return {
        success: false,
        errorMessage:
          payload && typeof payload === "object" && "error" in payload && payload.error
            ? payload.error
            : "ไม่สามารถบันทึกคำตอบได้",
      };
    }

    const savedItem =
      payload && typeof payload === "object" && "data" in payload && payload.data && typeof payload.data === "object"
        ? (payload.data as { isCorrect?: boolean; correctness?: number })
        : null;

    return {
      success: true,
      data: {
        answerId: `assessment-item-${questionId}`,
        questionId: String(questionId),
        answerType: answer.answerType,
        selectedOptionId: answer.selectedOptionId,
        mockRecordingState: answer.mockRecordingState,
        hintCountUsed: answer.hintCountUsed,
        responseTimeMs: answer.responseTimeMs,
        isCorrect: savedItem?.isCorrect ?? answer.isCorrect,
        skipped: answer.skipped,
        savedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "ไม่สามารถบันทึกคำตอบได้",
    };
  }
}

export async function getStandardAssessmentResult(): Promise<
  AssessmentServiceResult<StandardAssessmentResult>
> {
  try {
    const { assessmentId } = await ensureAssessmentStarted();
    const baseUrl = getBaseUrl();

    const response = await fetch(`${baseUrl}/api/v1/assessments/${assessmentId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | AssessmentApiResponse
      | { error?: string }
      | null;

    const successPayload = payload as AssessmentApiResponse | null;

    if (!response.ok) {
      return {
        success: false,
        errorMessage:
          payload && typeof payload === "object" && "error" in payload && payload.error
            ? payload.error
            : "ไม่สามารถสรุปผลแบบทดสอบก่อนใช้งานได้",
      };
    }

    console.log(successPayload?.data);

    const categoryResults = (successPayload?.data?.categoryResults ?? []) as Array<{
      categoryId?: number;
      totalScore?: number;
      maxScore?: number;
      recommendedDifficultyId?: number;
      category?: {
        categoryName?: string;
      };
    }>;
    const totalQuestions = currentAssessmentQuestionCount || categoryResults.length || 0;

    clearAssessmentSession();

    return {
      success: true,
      data: {
        sessionId: `assessment-${assessmentId}`,
        title: "จบการประเมิน",
        subtitle: "ระบบบันทึกผลเรียบร้อยแล้ว",
        completedQuestions: totalQuestions,
        totalQuestions,
        summaryTitle: `ทำครบ ${totalQuestions} ข้อ`,
        summaryText: "ระบบจะนำผลไปใช้จัดแผนการฝึกครั้งถัดไป",
        categorySummaries: categoryResults.map((result, index: number) => ({
          category: (result.category?.categoryName ?? ["spontaneous", "comprehension", "repetition", "naming"][index % 4]) as StandardAssessmentQuestion["category"],
          label: result.category?.categoryName ?? `หมวดที่ ${index + 1}`,
          summaryText: `บันทึกคะแนนแล้ว ${result.totalScore ?? 0}/${result.maxScore ?? 0}`,
          recommendedDifficultyId: result.recommendedDifficultyId!,
          noteText: "ผลจะถูกใช้ในการวางแผนการฝึกครั้งถัดไป",
        })),
        homeButtonText: "กลับหน้าหลัก",
      },
    };
  } catch (error) {
    return {
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "ไม่สามารถสรุปผลแบบทดสอบก่อนใช้งานได้",
    };
  }
}
