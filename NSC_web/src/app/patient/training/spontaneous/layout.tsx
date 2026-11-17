import type { ReactNode } from "react";
import { PatientTrainingGate } from "@/features/patient/components/PatientTrainingGate";
export default function Layout({ children }: { children: ReactNode }) {
	return <PatientTrainingGate>{children}</PatientTrainingGate>;
}
