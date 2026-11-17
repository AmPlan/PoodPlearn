// Add only files explicitly supplied/confirmed by the owner. No synthesis or AI runtime.
export const patientAudioManifest = {
	namingPrompt: "/training_sounds/Naming_Question.wav",
	namingHints: {} as Record<string, string>,
	// Verified first syllables, supplied separately; never infer from the first letter.
	namingInitialSyllables: {} as Record<string, string>,
	namingAnswers: {} as Record<string, string>,
	assessmentQuestions: {} as Record<string, string>,
	assessmentHints: {} as Record<string, string>,
	assessmentAnswers: {} as Record<string, string>,
	// Gemini prompt recordings for the separate 90-item Repetition catalog.
	repetitionQuestions: {} as Record<string, string>,
	comprehensionQuestions: {} as Record<string, string>,
	spontaneousQuestions: {} as Record<string, string>,
	feedback: {} as Record<string, string>,
	milestones: {} as Record<string, string>,
	// Full reminder clips keyed by next question number, e.g. "8".
	// The owner supplies the actual recordings; never synthesize or guess a clip.
	remainingQuestions: {} as Record<string, string>,
};

export function approvedPatientAudio(source?: string) {
	if (!source) return undefined;
	const approved = [
		patientAudioManifest.namingPrompt,
		...Object.values(patientAudioManifest.namingHints),
		...Object.values(patientAudioManifest.namingAnswers),
		...Object.values(patientAudioManifest.assessmentQuestions),
		...Object.values(patientAudioManifest.assessmentHints),
		...Object.values(patientAudioManifest.assessmentAnswers),
		...Object.values(patientAudioManifest.repetitionQuestions),
		...Object.values(patientAudioManifest.comprehensionQuestions),
		...Object.values(patientAudioManifest.spontaneousQuestions),
		...Object.values(patientAudioManifest.feedback),
		...Object.values(patientAudioManifest.milestones),
		...Object.values(patientAudioManifest.remainingQuestions),
	];
	try {
		const path = new URL(source, "http://local-preview").pathname;
		return approved.find((item) => item === path);
	} catch {
		return undefined;
	}
}
