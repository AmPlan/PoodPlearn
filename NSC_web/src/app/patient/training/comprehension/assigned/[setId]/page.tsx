import { ComprehensionTrainingClient } from "@/features/training/components/ComprehensionTrainingClient";
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
		<ComprehensionTrainingClient
			key={`${setId}:${schedule ?? ""}`}
			assignedSetId={setId}
			schedule={schedule}
		/>
	);
}
