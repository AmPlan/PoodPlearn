import { TherapistPatientDetail } from "@/features/therapist/components/TherapistPatientDetail";
import TherapistPatientDetailFallback from "@/features/therapist/components/TherapistPatientDetailFallback";
import { getPatientClinicalOverview } from "@/features/therapist/services/therapistClinicalService";
import { getTherapistPatientDetail } from "@/features/therapist/services/therapistDashboardService";

type PageProps = {
  params: Promise<{
    patientId: string;
  }>;
};

export default async function TherapistPatientDetailPage({ params }: PageProps) {
  const { patientId } = await params;
  const [result, clinicalResult] = await Promise.all([
    getTherapistPatientDetail(patientId),
    getPatientClinicalOverview(patientId),
  ]);

  console.log(result)

  if (!result.success) {
    return <TherapistPatientDetailFallback patientId={patientId} />;
  }

  if (!clinicalResult.success) {
    return <TherapistPatientDetailFallback patientId={patientId} />;
  }

  return (
    <TherapistPatientDetail
      patient={result.data}
      categoryScores={clinicalResult.data.categoryScores}
      progressBySession={clinicalResult.data.progressBySession}
    />
  );
}
