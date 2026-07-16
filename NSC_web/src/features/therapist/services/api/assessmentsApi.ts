import type { TherapistServiceResult } from "../../types/therapist.types";
import { request, type ServerContext } from "./apiClient";

const BASE = "/api/v1/assessments";

export function fetchAssessmentsApi<T>(
  endpoint: string,
  options?: RequestInit,
  serverContext?: ServerContext
): Promise<TherapistServiceResult<T>> {
  return request<T>(BASE, endpoint, options, serverContext);
}

// ---------------------------------------------------------------------------
// Assessment-local types (GET /api/v1/assessments/latest)
// Kept here since they're only used by the assessments module.
// ---------------------------------------------------------------------------

export interface ApiAssessmentCategoryResult {
  category?: { categoryId: number; categoryName: string } | null;
  recommendedDifficulty?: {
    difficultyId: number;
    difficultyLevel: number;
    difficultyName: string;
  } | null;
  [key: string]: unknown;
}

export interface ApiAssessmentRecord {
  assessmentId: number;
  patientId: number;
  startedAt: string;
  endedAt?: string | null;
  totalScore?: number | null;
  maxScore?: number | null;
  percentage?: number | null;
  trainingSet?: {
    setId: number;
    title: string;
    isStandardAssessment: boolean;
  } | null;
  assessmentCategoryResults: ApiAssessmentCategoryResult[];
}

interface ApiAssessmentLatestResponse {
  assessment: ApiAssessmentRecord | null;
}

/**
 * Fetches a single patient's most recent completed assessment.
 * Returns null for invalid input, failed requests, or empty responses.
 */
export async function getLatestAssessmentForPatient(
  patientId: string | number,
  serverContext?: ServerContext
): Promise<ApiAssessmentRecord | null> {
  const normalizedPatientId = String(patientId).trim();

  if (!normalizedPatientId) {
    return null;
  }

  const query = new URLSearchParams({ patientId: normalizedPatientId });
  const result = await fetchAssessmentsApi<ApiAssessmentLatestResponse>(
    `/latest?${query.toString()}`,
    undefined,
    serverContext
  );

  if (!result.success) {
    return null;
  }

  const assessment = result.data?.assessment;

  if (!assessment || typeof assessment !== "object") {
    return null;
  }

  return assessment;
}
