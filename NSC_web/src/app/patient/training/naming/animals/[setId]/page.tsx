import { NamingTrainingSessionClient } from "@/features/training/components/NamingTrainingSessionClient";
import type { NamingSet } from "@/features/training/types/pn002Naming.types";

//TODO แก้ไข

type PageProps = {
  params: Promise<{
    setId: NamingSet["id"];
  }>;
};

export default async function PatientNamingSetSessionPage({ params }: PageProps) {
  const { setId } = await params;

  return <NamingTrainingSessionClient setId={setId} />;
}
