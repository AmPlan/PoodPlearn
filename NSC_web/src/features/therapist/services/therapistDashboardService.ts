/**
 * Public API for therapist services.
 *
 * This file re-exports the implementation from focused modules so that
 * existing imports (e.g. `from "@/features/therapist/services/therapistDashboardService"`)
 * continue to work without changes.
 */

// ---------------------------------------------------------------------------
// Dashboard & patient CRUD (business logic)
// ---------------------------------------------------------------------------
export {
  getTherapistDashboardData,
  getTherapistPatientDetail,
  createPatient,
  updatePatientProfile,
  deletePatient,
} from "./patientService";

// ---------------------------------------------------------------------------
// Patient-code validation helpers
// ---------------------------------------------------------------------------
export {
  normalizePatientCode,
  generatePatientCode,
  validatePatientCodeFormat,
  isPatientCodeUnique,
} from "./helpers/patientCode";
