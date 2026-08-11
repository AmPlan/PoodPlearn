import type {
	PatientHomeResult,
	PatientHomeState
} from "../types/patientHome.types";

type PatientHomeApiResponse = {
	patient: {
		code: string | number;
		name: string;
	};
	nextAction: {
		type: PatientHomeState;
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
        type: payload.nextAction.type,
        targetPath: payload.nextAction.targetPath,
      },
    },
  };
}
