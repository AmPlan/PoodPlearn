import { AssessmentSessionClient } from "@/features/assessment/components/AssessmentSessionClient";
import { previewAssessmentSession } from "@/features/patient/data/frontendPreview";
export default function Page() {
	return <AssessmentSessionClient previewSession={previewAssessmentSession} />;
}
