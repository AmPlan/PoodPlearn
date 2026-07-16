import type {
  ApiCreatePatientResponse,
  ApiPatientListResponse,
  ApiPatientRecord,
  CreatePatientPayload,
  PatientProfile,
  TherapistDashboardData,
  TherapistPatientDetail,
  TherapistPatientSummary,
  TherapistServiceResult,
  ApiHistoryResponse,
} from "../types/therapist.types";

import { fetchPatientsApi } from "./api/patientsApi";
import { fetchSessionsApi } from "./api/sessionsApi";
import { getLatestAssessmentForPatient } from "./api/assessmentsApi";
import { request, type ServerContext } from "./api/apiClient";

import {
  mapApiPatientToSummary,
  buildPatientProfile,
  buildLatestNamingSummary,
  buildPn001Summary,
} from "./mappers/patientMapper";
import { mapApiSessionToRecentSession } from "./mappers/sessionMapper";


// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function isToday(date: Date) : boolean {
  const today = new Date();
  return (date!.getDate() === today.getDate() &&
    date!.getMonth() === today.getMonth() &&
    date!.getFullYear() === today.getFullYear());

}

export async function getTherapistDashboardData(
  params?: { search?: string; page?: number; pageSize?: number },
  serverContext?: ServerContext
): Promise<TherapistServiceResult<TherapistDashboardData>> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const queryString = query.toString();

  let activeToday = 0;
  let followUpCount = 0;

  const [patientsResult, sessionsResult] = await Promise.all([
    fetchPatientsApi<ApiPatientListResponse>(
      queryString ? `?${queryString}` : "",
      undefined,
      serverContext
    ),
    fetchSessionsApi<ApiHistoryResponse>("/history/all-sessions", undefined, serverContext),
  ]);

  if (!patientsResult.success) {
    return patientsResult;
  }

  const patients = Array.isArray(patientsResult.data?.data)
    ? patientsResult.data.data.map(mapApiPatientToSummary)
    : [];

  const patientsWithAssessments = await Promise.all(
    patients.map(async (patient) => {
      const assessment = await getLatestAssessmentForPatient(patient.id, serverContext);
      const assessmentPercentage = assessment ? 100 : 0;
      const latestAssessmentDate = assessment?.endedAt ?? undefined;

      const lastSessionDate = patient.lastSessionAt ? new Date(patient.lastSessionAt) : null;
      const lastAssessmentDate = assessment?.endedAt ? new Date(assessment.endedAt) : null;

      const sessionPercentage = lastSessionDate ? (isToday(lastSessionDate) ? 100 : 0) : 0;


      if (lastSessionDate || lastAssessmentDate) {
        const today = new Date();

        let lastTraining = null;
        if (lastSessionDate && lastAssessmentDate) {
          lastTraining = lastSessionDate > lastAssessmentDate ? lastSessionDate : lastAssessmentDate;
        }
        else {
          lastTraining = lastSessionDate || lastAssessmentDate;
        }

        // TODO เปลี่ยนเป็น 7 วัน
        // Set a threshold for exactly 7 days ago at midnight (00:00:00)
        const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3);

        if (isToday(lastTraining!)) {
          activeToday++;
        }
        else if (lastTraining! <= sevenDaysAgo) {
          patient.needsFollowUp = true;
          followUpCount++;
        }
      }
        
      return {
        ...patient,
        assessmentPercentage,
        sessionPercentage,
        latestAssessmentDate,
      };
    })
  );

  const recentSessions =
    sessionsResult.success && Array.isArray(sessionsResult.data?.data)
      ? sessionsResult.data.data.map(mapApiSessionToRecentSession)
      : [];

  return {
    success: true,
    data: {
      totalPatients: patientsResult.data?.pagination?.total ?? 0,
      activeToday: activeToday,
      followUpCount: followUpCount,
      patients: patientsWithAssessments,
      recentSessions,
    },
  };
}

// ---------------------------------------------------------------------------
// Patient detail
// ---------------------------------------------------------------------------

export async function getTherapistPatientDetail(
  patientId: string,
  serverContext?: ServerContext
): Promise<TherapistServiceResult<TherapistPatientDetail>> {
  const [result, latestAssessment] = await Promise.all([
    fetchPatientsApi<{ patient: ApiPatientRecord }>(
      `/${patientId}`,
      undefined,
      serverContext
    ),
    getLatestAssessmentForPatient(patientId, serverContext),
  ]);

  if (!result.success || !result.data?.patient) {
    return {
      success: false,
      errorMessage: result.errorMessage || "Unable to load patient profile.",
    };
  }

  const patient = result.data.patient;
  const summary = mapApiPatientToSummary(patient);
  const assessmentPercentage = latestAssessment ? 100 : 0;
  const latestAssessmentDate = latestAssessment?.endedAt ?? undefined;

  return {
    success: true,
    data: {
      ...summary,
      assessmentPercentage,
      patientProfile: buildPatientProfile(patient, summary),
      caregiverName: `${patient.caregiverFirstName ?? ""} ${patient.caregiverLastName ?? ""}`.trim(),
      latestAssessmentDate,
      pn001Summary: buildPn001Summary(latestAssessment),
      pn002Naming: buildLatestNamingSummary(patient),
    },
  };
}

// ---------------------------------------------------------------------------
// Create patient
// ---------------------------------------------------------------------------

export async function createPatient(
  patient: CreatePatientPayload
): Promise<TherapistServiceResult<TherapistPatientSummary>> {
  const result = await fetchPatientsApi<ApiCreatePatientResponse>("", {
    method: "POST",
    body: JSON.stringify(patient),
  });

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: mapApiPatientToSummary(result.data.patient),
  };
}

// ---------------------------------------------------------------------------
// Update patient
// ---------------------------------------------------------------------------

export async function updatePatientProfile(
  patientId: string,
  patientProfile: PatientProfile
): Promise<TherapistServiceResult<TherapistPatientDetail>> {
  const payload = {
    account: patientProfile.patientCode,
    password: patientProfile.patientCode,
    patientFirstName: patientProfile.firstName,
    patientLastName: patientProfile.lastName,
    gender:
      patientProfile.gender === "หญิง"
        ? "FEMALE"
        : patientProfile.gender === "ชาย"
          ? "MALE"
          : "OTHER",
    dateOfBirth: patientProfile.dateOfBirth,
    occupation: patientProfile.occupation,
    province: patientProfile.province,
    note: null,
    caregiverFirstName: patientProfile.caregiverFirstName,
    caregiverLastName: patientProfile.caregiverLastName,
    caregiverRelationship: patientProfile.caregiverRelationship,
    caregiverTelephone: patientProfile.caregiverTelephone || null,
    householdMembersCount: patientProfile.householdMembersCount,
    familyStatus: patientProfile.familyStatus,
    childrenCount: patientProfile.childrenCount,
    postcode: patientProfile.postalCode,
  };

  const [result, latestAssessment] = await Promise.all([
    fetchPatientsApi<{ patient: ApiPatientRecord }>(`/${patientId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
    getLatestAssessmentForPatient(patientId),
  ]);

  if (!result.success || !result.data?.patient) {
    return {
      success: false,
      errorMessage: result.errorMessage || "Unable to update patient profile.",
    };
  }

  const patient = result.data.patient;
  const summary = mapApiPatientToSummary(patient);
  const assessmentPercentage = latestAssessment ? 100 : 0;
  const latestAssessmentDate = latestAssessment?.endedAt ?? undefined;

  return {
    success: true,
    data: {
      ...summary,
      assessmentPercentage,
      patientProfile: buildPatientProfile(patient, summary),
      caregiverName: `${patient.caregiverFirstName ?? ""} ${patient.caregiverLastName ?? ""}`.trim(),
      latestAssessmentDate,
      pn001Summary: buildPn001Summary(latestAssessment),
      pn002Naming: buildLatestNamingSummary(patient),
    },
  };
}

// ---------------------------------------------------------------------------
// Delete patient
// ---------------------------------------------------------------------------

export async function deletePatient(
  patientId: string
): Promise<TherapistServiceResult<null>> {
  return request<null>("/api/v1/patients", `/${patientId}`, {
    method: "DELETE",
  });
}
