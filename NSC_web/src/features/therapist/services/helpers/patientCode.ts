import type { ApiPatientListResponse } from "../../types/therapist.types";
import { fetchPatientsApi } from "../api/patientsApi";

export function normalizePatientCode(value: string): string {
  const trimmed = (value ?? "").trim().toUpperCase();

  if (!trimmed) {
    return "";
  }

  const digitsOnly = trimmed.replace(/[^A-Z0-9]/g, "");

  if (!digitsOnly) {
    return "";
  }

  return digitsOnly.startsWith("P") ? `P-${digitsOnly.slice(1)}` : `P-${digitsOnly}`;
}

export function generatePatientCode(): string {
  return `P-${String(Math.floor(100000 + Math.random() * 900000))}`;
}

export function validatePatientCodeFormat(value: string): boolean {
  return /^P-\d{6}$/.test(normalizePatientCode(value));
}

export async function isPatientCodeUnique(
  value: string,
  currentId?: string,
): Promise<boolean> {
  const normalizedCode = normalizePatientCode(value);

  if (!normalizedCode) {
    return false;
  }

  const response = await fetchPatientsApi<ApiPatientListResponse>(
    `?search=${encodeURIComponent(normalizedCode)}`,
  );

  if (!response.success || !Array.isArray(response.data?.data)) {
    return true;
  }

  const exactMatches = response.data.data.filter(
    (patient) => patient.user?.account === normalizedCode,
  );

  if (exactMatches.length === 0) {
    return true;
  }

  if (!currentId) {
    return false;
  }

  return exactMatches.every(
    (patient) => String(patient.patientId) === String(currentId),
  );
}
