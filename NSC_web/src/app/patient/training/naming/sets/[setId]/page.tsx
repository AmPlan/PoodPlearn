import { NamingTrainingSessionClient } from "@/features/training/components/NamingTrainingSessionClient";
export default async function Page({
	params,
}: {
	params: Promise<{ setId: string }>;
}) {
	const { setId } = await params;
	return <NamingTrainingSessionClient key={setId} setId={setId} />;
}
