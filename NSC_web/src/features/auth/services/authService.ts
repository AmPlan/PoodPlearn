import type { AuthRole, LoginResult } from "../types/auth.types";

const INVALID_ACCESS_CODE_MESSAGE =
  "ไม่พบรหัสเข้าใช้งาน กรุณาตรวจสอบอีกครั้ง";

const redirectPathByRole: Record<AuthRole, string> = {
  patient: "/patient/home",
  therapist: "/therapist/dashboard",
};

type LoginApiResponse = {
  userId: string;
  account: string;
  role: string;
  patientId?: number | null;
  therapistId?: number | null;
};

function normalizeRole(role: unknown): AuthRole | null {
  if (typeof role !== "string") {
    return null;
  }

  const normalizedRole = role.toLowerCase();
  return normalizedRole === "therapist"
    ? "therapist"
    : normalizedRole === "patient"
      ? "patient"
      : null;
}

export async function loginWithCredentials(
  account: string,
  password: string,
): Promise<LoginResult> {
  const normalizedAccount = account.trim();

  if (!normalizedAccount || !password) {
    return {
      success: false,
      errorMessage: "กรุณากรอกรหัสผู้ใช้งานและรหัสผ่าน",
    };
  }

  try {
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account: normalizedAccount,
        password,
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

    if (!role) {
      console.error("Login response contained an invalid role:", successData.role);
      return {
        success: false,
        errorMessage: "ไม่พบข้อมูลบทบาทผู้ใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
      };
    }

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
  } catch (error) {
    console.error("Failed to log in:", error);
    return {
      success: false,
      errorMessage: "ไม่สามารถเชื่อมต่อระบบเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
    };
  }
}
