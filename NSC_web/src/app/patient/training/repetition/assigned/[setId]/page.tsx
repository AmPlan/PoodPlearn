import { RepetitionTrainingClient } from "@/features/training/components/RepetitionTrainingClient";
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
		<RepetitionTrainingClient
			key={`${setId}:${schedule ?? ""}`}
			assignedSetId={setId}
			schedule={schedule}
		/>
	);
}
