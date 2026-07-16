"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPatientClinicalOverview } from "../services/therapistClinicalService";
import { getTherapistPatientDetail } from "../services/therapistDashboardService";
import type { TherapistPatientDetail as TherapistPatientDetailData } from "../types/therapist.types";
import type {
  CategoryScore,
  ProgressBySession,
} from "../types/therapistClinical.types";
import { TherapistPatientDetail } from "./TherapistPatientDetail";

export default function TherapistPatientDetailFallback({
  patientId,
}: {
  patientId: string;
}) {
  const [patient, setPatient] = useState<TherapistPatientDetailData>();
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const [progressBySession, setProgressBySession] = useState<ProgressBySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadPatient() {
      const [patientResult, clinicalResult] = await Promise.all([
        getTherapistPatientDetail(patientId),
        getPatientClinicalOverview(patientId),
      ]);

      if (!isActive) {
        return;
      }

      if (!patientResult.success) {
        setErrorMessage(patientResult.errorMessage);
        setIsLoading(false);
        return;
      }

      setPatient(patientResult.data);
      setCategoryScores(clinicalResult.success ? clinicalResult.data.categoryScores : []);
      setProgressBySession(clinicalResult.success ? clinicalResult.data.progressBySession : []);
      setIsLoading(false);
    }

    loadPatient();

    return () => {
      isActive = false;
    };
  }, [patientId]);

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#EFFBFD] p-8">
        <p className="rounded-[32px] bg-white px-8 py-7 text-center text-2xl font-bold text-[#45686A] shadow-[0_18px_45px_rgba(24,112,108,0.08)]">
          กำลังโหลดข้อมูล...
        </p>
      </main>
    );
  }

  if (!patient) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#EFFBFD] p-8">
        <div className="w-full max-w-[560px] rounded-[32px] bg-white px-8 py-8 text-center shadow-[0_18px_45px_rgba(24,112,108,0.08)] ring-1 ring-[#CDEEEF]">
          <p className="text-2xl font-bold text-[#B42318]">
            {errorMessage || "ไม่พบข้อมูลผู้รับบริการ"}
          </p>
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
    <TherapistPatientDetail
      patient={patient}
      categoryScores={categoryScores}
      progressBySession={progressBySession}
    />
  );
}
