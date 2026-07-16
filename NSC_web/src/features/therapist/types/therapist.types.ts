import { Assessment } from "@/types/assessment";

export type ApiRecentSession = {
  sessionCategoryId?: number;
  setId?: number;
  totalScore?: number;
  averageResponseTime?: number;
  averageHintUsed?: number;
  startedAt?: string;
  endedAt?: string | null;
  trainingSet?: {
    categoryId: number;
    difficultyId: number;
    title: string;
  } | null;
  sessionId: number;
};

export type TherapistPatientSummary = {
  id: string;
  code: string;
  name: string;
  age: number;
  lastSession?: ApiRecentSession | null;
  lastSessionAt?: string;
  latestAssessmentDate?: string;
  needsFollowUp: boolean;
  caregiverFirstName: string;
  caregiverLastName: string;
  assessmentPercentage: number;
  sessionPercentage: number;
  caregiverRelationship: string;
  householdMembersCount: number;
  dateOfBirth: Date;
  latestTrainingSet?: string;
};

export type ApiHistoryRecord =
  | {
    type: 'SESSION';
    endedAt: string;
    data: {
      sessionId: number;
      patientId: number;
      patient: {
        patientId: number;
        patientFirstName: string;
        patientLastName: string;
      };
      sessionCategoryResult: sessionCategoryResult | null;
    };
  }
  | {
    type: 'ASSESSMENT';
    endedAt: string;
    data: {
      assessmentResultId: number;
      patientId: number;
      setId: number;
      startedAt: string;
      endedAt: string | null;
      patient: {
        patientId: number;
        patientFirstName: string;
        patientLastName: string;
      };
      trainingSet: {
        setId: number;
        title: string;
        categoryId: number;
      };
    };
  };

export type ApiHistoryResponse = {
  message: string;
  data: ApiHistoryRecord[];
};

export type sessionCategoryResult = 
{
  sessionCategoryId: number;
  totalScore: string;
  averageResponseTime: string;
  averageHintUsed: string;
  startedAt: string;
  endedAt: string | null;
  trainingSet: {
    setId: number;
    title: string;
    categoryId: number;
  };
} | null; 


export type TherapistRecentSession = {
  id: string;
  patientId: string;
  patientName: string;
  moduleName: string;
  summary: string;
  completedAt: string;
};

export type TherapistDashboardData = {
  totalPatients: number;
  activeToday: number;
  followUpCount: number;
  patients: TherapistPatientSummary[];
  recentSessions: TherapistRecentSession[];
};

export type PatientProfile = {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  province: string;
  postalCode: string;
  occupation: string;
  caregiverFirstName: string;
  caregiverLastName: string;
  caregiverRelationship: string;
  caregiverTelephone: string;
  familyStatus: string;
  householdMembersCount: number;
  hasChildren: boolean;
  childrenCount: number;
};

export type TherapistPatientDetail = TherapistPatientSummary & {
  patientProfile: PatientProfile;
  caregiverName: string;
  pn001Summary: {
    title: string;
    completedQuestions: number;
    totalQuestions: number;
    note: string;
  };
  pn002Naming: {
    categoryName: string;
    latestSetTitle: string;
    completedQuestions: number;
    totalQuestions: number;
    correctWords: string[];
    missedWords: string[];
    wordsToReview: string[];
  };
};

// ---------------------------------------------------------------------------
// Types matching the real backend: GET /api/patients and POST /api/patients
// (see app/api/patients/route.ts). These are intentionally separate from the
// richer TherapistPatientDetail shape above, since the current backend does
// not return session history, progress percentages, or assessment data yet.
// ---------------------------------------------------------------------------

export type ApiGender = "MALE" | "FEMALE" | "OTHER";

/** Shape of a single patient record as returned by GET /api/patients. */
export type ApiPatientRecord = {
  patientId: number;
  userId: number;
  patientFirstName: string;
  patientLastName: string;
  gender: ApiGender;
  dateOfBirth: string;
  occupation: string;
  province: string;
  note: string | null;
  caregiverFirstName: string;
  caregiverLastName: string;
  caregiverRelationship: string;
  caregiverTelephone: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    account: string;
    role: "PATIENT" | "THERAPIST";
    createdAt: string;
  };
  householdMembersCount: number;
  childrenCount: number;
  postcode: string;
  familyStatus: string;
  recentSessions: ApiRecentSession[];
  lastAssessment: Assessment;
};

export type ApiPatientListResponse = {
  message: string;
  data: ApiPatientRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

/** Payload required by POST /api/patients to create a new patient. */
export type CreatePatientPayload = {
  account: string;
  password: string;
  patientFirstName: string;
  patientLastName: string;
  gender: ApiGender;
  dateOfBirth: string;
  occupation: string;
  province: string;
  note?: string;
  familyStatus: string;
  caregiverFirstName: string;
  caregiverLastName: string;
  caregiverRelationship: string;
  caregiverTelephone: string;
  householdMembersCount: number;
  childrenCount: number;
  postcode: string;
};

export type ApiCreatePatientResponse = {
  message: string;
  user: {
    userId: number;
    account: string;
    role: "PATIENT" | "THERAPIST";
    createdAt: string;
    updatedAt: string;
  };
  patient: ApiPatientRecord;
};

export type TherapistServiceSuccessResult<T> = {
  success: true;
  data: T;
  errorMessage?: never;
};

export type TherapistServiceFailureResult = {
  success: false;
  data?: never;
  errorMessage: string;
};

export type TherapistServiceResult<T> =
  | TherapistServiceSuccessResult<T>
  | TherapistServiceFailureResult;