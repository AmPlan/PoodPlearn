import { NamingTrainingSessionClient } from "@/features/training/components/NamingTrainingSessionClient";
import type { NamingSet } from "@/features/training/types/pn002Naming.types";
import { findCatalogSet } from "@/features/training/data/namingCatalog";

//TODO แก้ไข

type PageProps = {
	params: Promise<{
		setId: NamingSet["id"];
	}>;
};

export default async function PatientNamingSetSessionPage({
	params,
}: PageProps) {
	const { setId } = await params;

	return findCatalogSet(setId) ? (
		<NamingTrainingSessionClient key={setId} setId={setId} />
	) : (
		<NamingTrainingSessionClient key={setId} assignedSetId={setId} />
	);
}
