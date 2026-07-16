import { createMockNamingSession } from "./pn002NamingService";
import type {
  TodayTrainingPlan,
  TrainingPlanServiceResult,
} from "../types/trainingPlan.types";

const MOCK_API_DELAY_MS = 180;

async function waitForMockApi() {
  await new Promise((resolve) => setTimeout(resolve, MOCK_API_DELAY_MS));
}

function createSuccess<T>(data: T): TrainingPlanServiceResult<T> {
  return { success: true, data };
}

function createFailure<T>(errorMessage: string): TrainingPlanServiceResult<T> {
  return { success: false, errorMessage };
}

export async function getTodayTrainingPlan(
  patientId: number,
): Promise<TrainingPlanServiceResult<TodayTrainingPlan>> {
  await waitForMockApi();

  if (!patientId) {
    return createFailure("ไม่พบข้อมูลผู้ป่วย");
  }

  const assignedSetId = "1" as const;
  const sessionResult = await createMockNamingSession(assignedSetId, patientId);

  if (!sessionResult.success) {
    return createFailure(sessionResult.errorMessage);
  }

  return createSuccess({
    patientId,
    planId: `plan-${patientId}-${Date.now()}`,
    sourceAssessmentId: "assessment-pn001-001",
    moduleId: "PN002",
    moduleName: "Naming",
    categoryId: "animals",
    categoryName: "สัตว์",
    assignedSetId,
    totalQuestions: 15,
    reason: "ระบบเลือกแบบฝึกให้จากผลการประเมินที่ผ่านมา",
    sessionId: sessionResult.data.sessionId,
    status: "ready",
  });
}
