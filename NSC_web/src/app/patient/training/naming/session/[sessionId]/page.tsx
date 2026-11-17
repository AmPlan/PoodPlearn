import { NamingTrainingSessionClient } from "@/features/training/components/NamingTrainingSessionClient";

type PageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function PatientNamingTrainingSessionPage({
  params,
}: PageProps) {
  const { sessionId } = await params;

  return <NamingTrainingSessionClient key={sessionId} sessionId={sessionId} />;
}
