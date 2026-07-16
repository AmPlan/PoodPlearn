import type { PatientHomeResult } from "../types/patientHome.types";

type PatientHomeApiResponse = {
  patient: {
    code: string | number;
    name: string;
  };
  nextAction: {
    type: string;
    eyebrow: string;
    title: string;
    description: string;
    progressPercent?: number;
    buttonText: string;
    targetPath: string;
  };
};

export async function getPatientHomeData(
  userId: number,
): Promise<PatientHomeResult> {
  
  const response = await fetch(`/api/v1/patients/home?userId=${userId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | PatientHomeApiResponse
    | { error?: string }
    | null;

  if (!response.ok || !data || "error" in data) {
    return {
      success: false,
      errorMessage:
        data && typeof data === "object" && "error" in data && data.error
          ? data.error
          : "ไม่สามารถโหลดข้อมูลผู้รับบริการได้",
    };
  }

  const payload = data as PatientHomeApiResponse;

  return {
    success: true,
    data: {
      patient: {
        id: String(payload.patient.code),
        code: String(payload.patient.code),
        name: payload.patient.name,
      },
      nextAction: {
        type:
          payload.nextAction.type === "has_daily_training_plan"
            ? "has_daily_training_plan"
            : "needs_standard_assessment",
        eyebrow: payload.nextAction.eyebrow,
        title: payload.nextAction.title,
        description: payload.nextAction.description,
        progressPercent: payload.nextAction.progressPercent,
        buttonText: payload.nextAction.buttonText,
        targetPath: payload.nextAction.targetPath,
      },
    },
  };
}
