import { NamingTrainingSessionClient } from "@/features/training/components/NamingTrainingSessionClient";
import { findCatalogSet } from "@/features/training/data/namingCatalog";
import { notFound } from "next/navigation";
export default async function Page({
	params,
}: {
	params: Promise<{ setId: string }>;
}) {
	const { setId } = await params;
	if (!findCatalogSet(setId)) notFound();
	return (
		<NamingTrainingSessionClient
			key={setId}
			setId={setId}
			homeHref="/dev/preview/returning"
		/>
	);
}
