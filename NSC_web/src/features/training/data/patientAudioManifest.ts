// Add only files explicitly supplied/confirmed by the owner. No synthesis or AI runtime.
export const patientAudioManifest = {
	namingPrompt: "/training_sounds/Naming_Question.wav",
	namingHints: {} as Record<string, string>,
	namingAnswers: {} as Record<string, string>,
	assessmentQuestions: {} as Record<string, string>,
};

export function approvedPatientAudio(source?: string) {
	if (!source) return undefined;
	const approved = [
		patientAudioManifest.namingPrompt,
		...Object.values(patientAudioManifest.namingHints),
		...Object.values(patientAudioManifest.namingAnswers),
		...Object.values(patientAudioManifest.assessmentQuestions),
	];
	try {
		const path = new URL(source, "http://local-preview").pathname;
		return approved.find((item) => item === path);
	} catch {
		return undefined;
	}
}
