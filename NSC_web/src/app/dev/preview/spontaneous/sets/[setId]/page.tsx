import { notFound } from "next/navigation";
import { findSpontaneousSet } from "@/features/training/data/spontaneousCatalog";
import { SpontaneousTrainingClient } from "@/features/training/components/SpontaneousTrainingClient";
export default async function Page({
	params,
}: {
	params: Promise<{ setId: string }>;
}) {
	const { setId } = await params;
	if (!findSpontaneousSet(setId)) notFound();
	return <SpontaneousTrainingClient key={setId} setId={setId} preview />;
}
