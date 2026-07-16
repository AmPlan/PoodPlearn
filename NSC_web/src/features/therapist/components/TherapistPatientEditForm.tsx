"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PatientForm, { createEmptyPatientProfile } from "./PatientForm";
import {
  getTherapistPatientDetail,
  updatePatientProfile,
} from "../services/therapistDashboardService";
import type { PatientProfile } from "../types/therapist.types";

export default function TherapistPatientEditForm({
  patientId,
  initialProfile,
}: {
  patientId: string;
  initialProfile?: PatientProfile;
}) {
  const router = useRouter();
  const [loadedProfile, setLoadedProfile] = useState<PatientProfile | undefined>(
    initialProfile,
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState(!initialProfile);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      if (initialProfile) {
        return;
      }

      const result = await getTherapistPatientDetail(patientId);
      if (!isActive) {
        return;
      }

      if (!result.success) {
        setLoadError(result.errorMessage);
        setIsLoadingProfile(false);
        return;
      }

      setLoadedProfile(result.data.patientProfile);
      setIsLoadingProfile(false);
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [initialProfile, patientId]);

  async function handleUpdatePatient(profile: PatientProfile) {
    const result = await updatePatientProfile(patientId, {
      ...profile,
      id: patientId,
    });

    if (!result.success) {
      window.alert(result.errorMessage);
      return false;
    }

    router.push(`/therapist/patients/${patientId}`);
    return true;
  }

  if (isLoadingProfile) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#EFFBFD] p-6 text-[#123232]">
        <p className="rounded-[28px] bg-white px-7 py-6 text-center text-2xl font-bold shadow-[0_18px_45px_rgba(24,112,108,0.08)] ring-1 ring-[#CDEEEF]">
          กำลังโหลดข้อมูล...
        </p>
      </main>
    );
  }

  if (loadError && !loadedProfile) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#EFFBFD] p-6">
        <div className="w-full max-w-[560px] rounded-[32px] bg-white px-8 py-8 text-center shadow-[0_18px_45px_rgba(24,112,108,0.08)] ring-1 ring-[#CDEEEF]">
          <h1 className="text-2xl font-bold text-[#B42318]">
            ไม่พบข้อมูลผู้รับบริการ
          </h1>
          <Link
            href="/therapist/patients"
            className="mt-6 inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#1FA89C] px-6 text-base font-bold text-white shadow-[0_10px_24px_rgba(31,168,156,0.22)] hover:bg-[#178F84]"
          >
            กลับไปรายการผู้รับบริการ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <PatientForm
      mode="edit"
      initialValues={createEmptyPatientProfile({
        ...loadedProfile,
        id: patientId,
      })}
      onSubmit={handleUpdatePatient}
      cancelHref={`/therapist/patients/${patientId}`}
    />
  );
}
