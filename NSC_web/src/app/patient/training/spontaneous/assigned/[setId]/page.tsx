import { SpontaneousTrainingClient } from "@/features/training/components/SpontaneousTrainingClient";
export default async function Page({
	params,
	searchParams,
}: {
	params: Promise<{ setId: string }>;
	searchParams: Promise<{ schedule?: string }>;
}) {
	const { setId } = await params;
	const { schedule } = await searchParams;
	return (
		<SpontaneousTrainingClient
			key={`${setId}:${schedule ?? ""}`}
			assignedSetId={setId}
			schedule={schedule}
		/>
	);
}
