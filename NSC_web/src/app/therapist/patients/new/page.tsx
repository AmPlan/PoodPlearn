"use client";

import { useRouter } from "next/navigation";
import PatientForm, {
  createEmptyPatientProfile,
} from "@/features/therapist/components/PatientForm";
import { createPatient } from "@/features/therapist/services/therapistDashboardService";
import type {
  ApiGender,
  CreatePatientPayload,
  PatientProfile,
} from "@/features/therapist/types/therapist.types";

const emptyPatient = createEmptyPatientProfile();

function createPatientPayloadFromProfile(
  profile: PatientProfile,
): CreatePatientPayload {

  let gender : ApiGender;

  switch (profile.gender) {
    case "ชาย":
      gender = "MALE";
      break;
    case "หญิง":
      gender = "FEMALE";
      break;
    default:
      gender = "OTHER"
  }

  return {
    account: profile.patientCode?.trim(),
    password: profile.patientCode?.trim(),
    patientFirstName: profile.firstName,
    patientLastName: profile.lastName,
    gender: gender,
    dateOfBirth: profile.dateOfBirth,
    occupation: profile.occupation,
    province: profile.province,
    note: profile.familyStatus,
    familyStatus: profile.familyStatus,
    caregiverFirstName: profile.caregiverFirstName,
    caregiverLastName: profile.lastName,
    caregiverRelationship: profile.caregiverRelationship,
    caregiverTelephone: profile.caregiverTelephone,
    childrenCount: profile.hasChildren ? profile.childrenCount : 0,
    householdMembersCount: profile.householdMembersCount,
    postcode: profile.postalCode
  };
}

export default function NewTherapistPatientPage() {
  const router = useRouter();

  async function handleCreatePatient(profile: PatientProfile) {
    const result = await createPatient(createPatientPayloadFromProfile(profile));

    if (!result.success) {
      window.alert(result.errorMessage);
      return false;
    }

    router.push("/therapist/patients");
    return true;
  }

  return (
    <PatientForm
      mode="create"
      initialValues={emptyPatient}
      onSubmit={handleCreatePatient}
      cancelHref="/therapist/patients"
    />
  );
}
