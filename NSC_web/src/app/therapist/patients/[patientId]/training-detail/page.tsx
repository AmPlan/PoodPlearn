import Link from "next/link";
import TherapistPatientDetailClient from "@/features/therapist/components/TherapistPatientDetailClient";
import { getPatientClinicalOverview } from "@/features/therapist/services/therapistClinicalService";
import { getTherapistPatientDetail } from "@/features/therapist/services/therapistDashboardService";

type PageProps = {
  params: Promise<{
    patientId: string;
  }>;
};

export default async function TherapistPatientTrainingDetailPage({
  params,
}: PageProps) {
  const { patientId } = await params;
  const [result, clinicalResult] = await Promise.all([
    getTherapistPatientDetail(patientId),
    getPatientClinicalOverview(patientId),
  ]);

  if (!result.success || !clinicalResult.success) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#EFFBFD] p-8">
        <p className="rounded-[32px] bg-white px-8 py-7 text-center text-2xl font-bold text-[#B42318] shadow-[0_18px_45px_rgba(24,112,108,0.08)]">
          {result.errorMessage}
        </p>
      </main>
    );
  }

  const patient = result.data;

  return (
    <main className="print-report-page min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-5 py-6 text-[#123232] sm:px-8">
      <div className="print-report-container mx-auto w-full max-w-[1180px]">
        <Link
          href={`/therapist/patients/${patient.id}`}
          className="no-print inline-flex min-h-[50px] items-center justify-center rounded-full bg-white px-6 text-base font-bold text-[#13756F] shadow-[0_10px_24px_rgba(17,103,99,0.1)] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF]"
        >
          กลับหน้า overview
        </Link>

        <section className="print-card mt-5 rounded-[34px] bg-white px-7 py-7 shadow-[0_18px_48px_rgba(17,103,99,0.1)] ring-1 ring-[#CDEEEF]">
          <p className="inline-flex min-h-[36px] items-center rounded-full bg-[#F2FBFB] px-4 text-sm font-bold text-[#12847D] ring-1 ring-[#CDEEEF]">
            {patient.code}
          </p>
          <h1 className="mt-3 text-[2.2rem] font-bold leading-tight sm:text-[2.8rem]">
            รายละเอียดการฝึกของ {patient.name}
          </h1>
          <p className="mt-2 text-lg font-semibold text-[#557276]">
            วันที่ประเมินล่าสุด {patient.latestAssessmentDate}
          </p>
        </section>

        <TherapistPatientDetailClient
          patient={patient}
          categoryScores={clinicalResult.data.categoryScores}
          progressBySession={clinicalResult.data.progressBySession}
        />
      </div>
    </main>
  );
}
