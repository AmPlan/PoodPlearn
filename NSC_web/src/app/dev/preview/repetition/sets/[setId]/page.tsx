import { notFound } from "next/navigation";
import { findRepetitionSet } from "@/features/training/data/repetitionCatalog";
import { RepetitionTrainingClient } from "@/features/training/components/RepetitionTrainingClient";
export default async function Page({
	params,
}: {
	params: Promise<{ setId: string }>;
}) {
	const { setId } = await params;
	if (!findRepetitionSet(setId)) notFound();
	return <RepetitionTrainingClient key={setId} setId={setId} preview />;
}
