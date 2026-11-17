import { notFound } from "next/navigation";
import { findComprehensionSet } from "@/features/training/data/comprehensionCatalog";
import { ComprehensionTrainingClient } from "@/features/training/components/ComprehensionTrainingClient";
export default async function Page({
	params,
}: {
	params: Promise<{ setId: string }>;
}) {
	const { setId } = await params;
	if (!findComprehensionSet(setId)) notFound();
	return <ComprehensionTrainingClient key={setId} setId={setId} preview />;
}
