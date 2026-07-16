import type { AuthRole, LoginResult } from "../types/auth.types";

const INVALID_ACCESS_CODE_MESSAGE =
  "ไม่พบรหัสเข้าใช้งาน กรุณาตรวจสอบอีกครั้ง";

const redirectPathByRole: Record<AuthRole, string> = {
  patient: "/patient/home",
  therapist: "/therapist/dashboard",
};

type LoginApiResponse = {
  userId: number;
  account: string;
  role: string;
  patientId?: number | null;
  therapistId?: number | null;
};

function normalizeRole(role: string): AuthRole {
  return role.toLowerCase() === "therapist" ? "therapist" : "patient";
}

export async function loginWithAccessCode(
  accessCode: string,
): Promise<LoginResult> {
  const normalizedCode = accessCode.trim();

  if (!normalizedCode) {
    return {
      success: false,
      errorMessage: INVALID_ACCESS_CODE_MESSAGE,
    };
  }

  const response = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      account: normalizedCode,
      password: normalizedCode,
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | LoginApiResponse
    | { error?: string }
    | null;

  if (!response.ok || !data || "error" in data) {
    return {
      success: false,
      errorMessage: data && "error" in data && data.error
        ? data.error
        : INVALID_ACCESS_CODE_MESSAGE,
    };
  }
  const successData = data as LoginApiResponse;

  const role = normalizeRole(successData.role);

  return {
    success: true,
    role,
    user: {
      id: successData.userId,
      accessCode: successData.account,
      role,
      displayName: successData.account,
      patientId: successData.patientId ?? null,
      therapistId: successData.therapistId ?? null,
    },
    redirectPath: redirectPathByRole[role],
  };
}
