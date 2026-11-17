import { NamingTrainingSessionClient } from "@/features/training/components/NamingTrainingSessionClient";
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
		<NamingTrainingSessionClient
			key={`${setId}:${schedule ?? ""}`}
			assignedSetId={setId}
			dailyPlanScheduleId={schedule}
		/>
	);
}
