import { PatientTrainingGate } from "@/features/patient/components/PatientTrainingGate";
import { TodayTrainingClient } from "@/features/training/components/TodayTrainingClient";
export default function Page() {
	return (
		<PatientTrainingGate>
			<TodayTrainingClient />
		</PatientTrainingGate>
	);
}
