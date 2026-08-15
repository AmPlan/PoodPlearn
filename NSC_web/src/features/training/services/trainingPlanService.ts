import type {
  TodayTrainingPlan,
  TrainingPlanServiceResult,
} from "../types/trainingPlan.types";

const DAILY_PLAN_API_BASE = "/api/v1/patients";

function createSuccess<T>(data: T): TrainingPlanServiceResult<T> {
  return { success: true, data };
}

function createFailure<T>(errorMessage: string): TrainingPlanServiceResult<T> {
  return { success: false, errorMessage };
}

type DailyPlanApiQuestion = {
  questionId: number;
  questionType: string;
  difficultyId: number;
  orderIndex: number;
  setId: number;
  setTitle: string;
  detail: string;
};

type DailyPlanApiTrainingSet = {
  setId: number;
  title: string;
  category: { categoryId: number; categoryName: string };
  difficultyLevel: { difficultyId: number; difficultyLevel: number; difficultyName: string };
};

type DailyPlanApiPayload = {
  dailyPlanScheduleId: number;
  status: string;
  scheduledDate: string;
  sessionId: number | null;
  trainingPlan: {
    trainingPlanId: number;
    planRole: string;
    trainingSet: DailyPlanApiTrainingSet;
  };
  sessionResult: unknown;
  trainingSets: Array<{ setId: number; title: string }>;
  questions: DailyPlanApiQuestion[];
};

export async function getTodayTrainingPlan(
  patientId: number,
): Promise<TrainingPlanServiceResult<TodayTrainingPlan>> {
  if (!patientId) {
    return createFailure("ไม่พบข้อมูลผู้ป่วย");
  }

  const date = new Date().toISOString().slice(0, 10);
  const url = `${DAILY_PLAN_API_BASE}/${patientId}/daily-plans?date=${date}`;

  try {
    const response = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					cache: "no-store",
				});

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorMessage =
        errorBody?.error || "ไม่สามารถโหลดแบบฝึกวันนี้ได้";
      return createFailure(errorMessage);
    }

    const body = (await response.json()) as { data: DailyPlanApiPayload[] };
    const plan = body.data[0];

    if (!plan) {
      return createFailure("ไม่พบแผนในวันนี้");
    }

    return createSuccess({
      patientId,
      planId: `daily-plan-${plan.dailyPlanScheduleId}`,
      sourceAssessmentId: `training-plan-${plan.trainingPlan.trainingPlanId}`,
      moduleId: "PN002",
      moduleName: "Naming",
      categoryId: plan.trainingPlan.trainingSet.category.categoryId.toString(),
      categoryName: plan.trainingPlan.trainingSet.category.categoryName,
      assignedSetId: plan.trainingPlan.trainingSet.setId.toString(),
      totalQuestions: plan.questions.length,
      reason: "ระบบเลือกแบบฝึกให้จากผลการฝึกที่ผ่านมา",
      sessionId: plan.sessionId?.toString() ?? "",
      status:
        plan.status === "PENDING"
          ? "ready"
          : plan.status === "IN_REVIEW"
          ? "in_progress"
          : plan.status === "COMPLETED"
          ? "completed"
          : "ready",
    });
  } catch {
    return createFailure("เกิดข้อผิดพลาดในการเชื่อมต่อไปยังระบบแบบฝึก");
  }
}
