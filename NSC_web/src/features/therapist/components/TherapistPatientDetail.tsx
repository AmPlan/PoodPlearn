"use client";

import Link from "next/link";
import type {
  PatientProfile,
  TherapistPatientDetail as TherapistPatientDetailData,
} from "../types/therapist.types";
import type {
  CategoryScore,
  ProgressBySession,
} from "../types/therapistClinical.types";
import TherapistPatientActions from "./TherapistPatientActions";
import TherapistPatientDetailClient from "./TherapistPatientDetailClient";
import PatientCodeCopyButton from "./PatientCodeCopyButton";

type TherapistPatientDetailProps = {
  categoryScores: CategoryScore[];
  patient: TherapistPatientDetailData;
  progressBySession: ProgressBySession[];
};

function getSafePatientProfile(
  patient: TherapistPatientDetailData,
): PatientProfile {
  const existingProfile = patient.patientProfile as Partial<PatientProfile> | undefined;

  return {
    id: existingProfile?.id || patient.id,
    patientCode: existingProfile?.patientCode || patient.code,
    firstName: existingProfile?.firstName || patient.name.split(" ")[0] || "",
    lastName: existingProfile?.lastName || patient.name.split(" ").slice(1).join(" ") || "",
    gender: existingProfile?.gender || "",
    dateOfBirth: existingProfile?.dateOfBirth || "",
    province: existingProfile?.province || "",
    postalCode: existingProfile?.postalCode || "",
    occupation: existingProfile?.occupation || "",
    caregiverFirstName: existingProfile?.caregiverFirstName || "",
    caregiverLastName: existingProfile?.caregiverLastName || "",
    caregiverRelationship: existingProfile?.caregiverRelationship || "",
    caregiverTelephone: existingProfile?.caregiverTelephone || "",
    familyStatus: existingProfile?.familyStatus || "",
    householdMembersCount: Number(existingProfile?.householdMembersCount) || 0,
    hasChildren: Boolean(existingProfile?.hasChildren),
    childrenCount: Number(existingProfile?.childrenCount) || 0,
  };
}

function ProfileChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#F8FEFF] px-4 py-3 ring-1 ring-[#D7EFF0]">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#12847D]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-[#123232]">{value || "—"}</p>
    </div>
  );
}

export function TherapistPatientDetail({
  categoryScores,
  patient,
  progressBySession,
}: TherapistPatientDetailProps) {
  const profile = getSafePatientProfile(patient);

  return (
    <main className="min-h-dvh overflow-x-clip bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-3 py-3 text-[#123232] sm:px-5">
      <div className="mx-auto flex w-full max-w-[1500px] min-w-0 flex-col">
        <section className="min-w-0 rounded-[24px] bg-white px-5 py-4 shadow-[0_14px_36px_rgba(17,103,99,0.08)] ring-1 ring-[#CDEEEF] sm:px-6">
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/therapist/patients"
                  className="no-print inline-flex min-h-[38px] items-center justify-center rounded-full bg-white px-4 text-sm font-bold text-[#13756F] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF]"
                >
                  กลับรายชื่อ
                </Link>
                <div className="no-print">
                  <PatientCodeCopyButton patientCode={profile.patientCode} />
                </div>
              </div>
              <h1 className="mt-3 text-[clamp(1.75rem,2.7vw,2.45rem)] font-bold leading-tight">
                {profile.firstName + " " + profile.lastName}
              </h1>
              <p className="mt-1 text-sm font-semibold text-[#557276]">
                ประเมินล่าสุด {patient.latestAssessmentDate?.slice(0, 10) || "—"} · ฝึกล่าสุด{" "}
                {patient.lastSessionAt?.slice(0, 10) || "—"}
              </p>
            </div>

            <div className="no-print xl:min-w-[360px]">
              <TherapistPatientActions patientId={patient.id} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ProfileChip label="อายุ" value={`${patient.age || "—"} ปี`} />
            <ProfileChip label="จังหวัด" value={profile.province || "—"} />
            <ProfileChip
              label="ผู้ดูแล"
              value={`${patient.caregiverFirstName + " " + patient.caregiverLastName} (${profile.caregiverRelationship || "—"})`}
            />
            <ProfileChip
              label="หมวดล่าสุด"
              value={patient.latestTrainingSet || "—"}
            />
            <ProfileChip
              label="ภาพรวมการฝึก"
              value={`${patient.lastSession?.totalScore || "—"}/${patient.lastSession ? 15 : "—"} ข้อ`}
            />
          </div>
        </section>

        <TherapistPatientDetailClient
          patient={patient}
          categoryScores={categoryScores}
          progressBySession={progressBySession}
        />
      </div>
    </main>
  );
}
