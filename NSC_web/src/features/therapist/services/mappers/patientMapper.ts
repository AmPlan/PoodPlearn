import type {
  ApiPatientRecord,
  PatientProfile,
  TherapistPatientSummary,
} from "../../types/therapist.types";
import type { ApiAssessmentRecord } from "../api/assessmentsApi";

// ---------------------------------------------------------------------------
// Age helper
// ---------------------------------------------------------------------------

export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}

// ---------------------------------------------------------------------------
// Patient summary mapper
// ---------------------------------------------------------------------------

export function mapApiPatientToSummary(record: ApiPatientRecord): TherapistPatientSummary {
  const lastSession = record.recentSessions ? record.recentSessions[0] : undefined;
  return {
    id: String(record.patientId),
    code: record.user?.account ?? "",
    name: `${record.patientFirstName ?? ""} ${record.patientLastName ?? ""}`.trim(),
    age: calculateAge(record.dateOfBirth ?? ""),
    lastSession: lastSession,
    lastSessionAt: lastSession?.endedAt?.toString() ?? undefined,
    caregiverFirstName: record.caregiverFirstName,
    caregiverLastName: record.caregiverLastName,
    caregiverRelationship: record.caregiverRelationship,
    dateOfBirth: new Date(record.dateOfBirth),
    needsFollowUp: false,
    householdMembersCount: record.householdMembersCount,
    assessmentPercentage: 0,
    sessionPercentage: 0,
    latestTrainingSet: lastSession?.trainingSet?.title ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Patient profile builder
// ---------------------------------------------------------------------------

export function buildPatientProfile(
  record: ApiPatientRecord,
  fallback: TherapistPatientSummary
): PatientProfile {
  const firstName = record.patientFirstName?.trim() ?? "";
  const lastName = record.patientLastName?.trim() ?? "";
  const childrenCount = Number(record.childrenCount ?? 0) || 0;

  return {
    id: String(record.patientId),
    patientCode: record.user?.account ?? fallback.code,
    firstName,
    lastName,
    gender: record.gender === "OTHER" ? "อื่น ๆ" : record.gender === "FEMALE" ? "หญิง" : "ชาย",
    dateOfBirth: record.dateOfBirth.trim().substring(0, 10) ?? "",
    province: record.province ?? "",
    postalCode: record.postcode ?? "",
    occupation: record.occupation ?? "",
    caregiverFirstName: record.caregiverFirstName ?? "",
    caregiverLastName: record.caregiverLastName ?? "",
    caregiverRelationship: record.caregiverRelationship ?? "",
    caregiverTelephone: record.caregiverTelephone ?? "",
    familyStatus: record.familyStatus ?? "",
    householdMembersCount: record.householdMembersCount,
    hasChildren: childrenCount > 0,
    childrenCount,
  };
}

// ---------------------------------------------------------------------------
// Naming summary builder
// ---------------------------------------------------------------------------

export function buildLatestNamingSummary(record: ApiPatientRecord) {
  const latestSession = record.recentSessions?.[0];
  const latestSetTitle = latestSession?.trainingSet?.title || "ยังไม่มีชุดล่าสุด";

  return {
    categoryName: "แบบฝึกเรียกชื่อภาพ",
    latestSetTitle,
    completedQuestions: latestSession ? 1 : 0,
    totalQuestions: latestSession ? 1 : 0,
    correctWords: [],
    missedWords: [],
    wordsToReview: [],
  };
}

// ---------------------------------------------------------------------------
// PN-001 summary builder
// ---------------------------------------------------------------------------

export function buildPn001Summary(assessment: ApiAssessmentRecord | null) {
  return {
    title: assessment?.trainingSet?.title ?? "",
    completedQuestions: assessment?.assessmentCategoryResults?.length ?? 0,
    totalQuestions: assessment?.assessmentCategoryResults?.length ?? 0,
    note: "",
  };
}
