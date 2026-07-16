import TherapistPatientEditForm from "@/features/therapist/components/TherapistPatientEditForm";
import { getTherapistPatientDetail } from "@/features/therapist/services/therapistDashboardService";

type PageProps = {
  params: Promise<{
    patientId: string;
  }>;
};

export default async function EditTherapistPatientPage({ params }: PageProps) {
  const { patientId } = await params;
  const result = await getTherapistPatientDetail(patientId);

  return (
    <TherapistPatientEditForm
      patientId={patientId}
      initialProfile={result.success ? result.data.patientProfile : undefined}
    />
  );
}
