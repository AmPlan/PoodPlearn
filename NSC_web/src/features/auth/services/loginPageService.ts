import { loginWithAccessCode } from "./authService";
import type { LoginResult } from "../types/auth.types";

export const PATIENT_CODE_PATTERN = /^PN\d{3,}$/;

export async function loginPatient(code: string): Promise<LoginResult> {
  try {
    const result = await loginWithAccessCode(code.trim().toUpperCase());
    if (result.success && result.role !== "patient") {
      return { success: false, errorMessage: "รหัสนี้ไม่ใช่รหัสคนไข้ กรุณาตรวจสอบกับนักแก้ไขการพูด" };
    }
    if (!result.success) {
      return { success: false, errorMessage: "รหัสไม่ถูกต้อง หรือระบบยังไม่พร้อม กรุณาตรวจสอบรหัสแล้วลองอีกครั้ง" };
    }
    return { ...result, redirectPath: "/patient/home" };
  } catch {
    return { success: false, errorMessage: "เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้งในภายหลัง" };
  }
}

// Backend integration contract: POST returns { authorizationUrl } for Google OAuth.
// Backend must allow only verified @gmail.com accounts with therapist permission,
// create the authenticated session, then redirect to /therapist/dashboard.
// No client-side role selection or email check grants access.
export async function startTherapistGoogleLogin(): Promise<string> {
  const response = await fetch("/api/v1/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnTo: "/therapist/dashboard" }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(response.status === 404 || response.status === 503
      ? "ระบบเข้าสู่ระบบด้วย Google ยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ"
      : "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองอีกครั้ง");
  }
  const data = await response.json();
  const url = new URL(data.authorizationUrl);
  if (url.protocol !== "https:" || url.hostname !== "accounts.google.com") {
    throw new Error("ระบบเข้าสู่ระบบด้วย Google ยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ");
  }
  return url.href;
}
