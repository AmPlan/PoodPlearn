import { namingCatalog, type CatalogSet } from "../data/namingCatalog";
import { getNamingSetById, submitNamingAnswer } from "./pn002NamingService";

export type NamingRunSet = CatalogSet & {
	backendSetId?: string;
	questionIds?: string[];
};
export type RoundResponse = {
	questionId: string;
	skipped: boolean;
	hintsUsed: number;
	revealed: boolean;
	recorded: boolean;
	submitted: boolean;
	correct?: boolean;
};

// Database IDs are independent of catalog IDs. Match all 15 answers uniquely.
export async function loadAssignedNamingSet(id: string): Promise<NamingRunSet> {
	const result = await getNamingSetById(id);
	if (!result.success) throw new Error(result.errorMessage);
	const questions = [...result.data.questions].sort(
		(a, b) => a.order - b.order,
	);
	const normalize = (word: string) => word.normalize("NFC").trim();
	const set = namingCatalog.find(
		(candidate) =>
			candidate.questions.length === questions.length &&
			candidate.questions.every(
				(item) =>
					questions.filter(
						(q) => normalize(q.answer) === normalize(item.answer),
					).length === 1,
			),
	);
	if (!set)
		throw new Error(
			"ชุดฝึกในระบบยังจับคู่กับรายการภาพ 15 ข้อไม่ได้ กรุณาติดต่อนักแก้ไขการพูด หรือเลือกฝึกจากคลังแบบฝึก",
		);
	return {
		...set,
		backendSetId: id,
		questionIds: set.questions.map(
			(item) =>
				questions.find((q) => normalize(q.answer) === normalize(item.answer))!
					.id,
		),
	};
}

export async function sendNamingResponse(input: {
	sessionId: string;
	setId: string;
	questionId: string;
	hintsUsed: number;
	responseTimeMs: number;
	voiceFile: Blob;
}): Promise<{ correct?: boolean }> {
	if (!input.voiceFile?.size) throw new Error("กรุณาบันทึกเสียงก่อน");
	const result = await submitNamingAnswer({
		sessionId: input.sessionId,
		setId: input.setId,
		questionId: input.questionId,
		answerType: "mock_audio",
		hintLevelUsed: input.hintsUsed as 0 | 1 | 2 | 3,
		responseTimeMs: input.responseTimeMs,
		voiceFile: input.voiceFile,
	});
	if (!result.success) throw new Error(result.errorMessage);
	return {
		correct:
			typeof result.data.isCorrect === "boolean"
				? result.data.isCorrect
				: undefined,
	};
}

export function summarizeRound(responses: RoundResponse[]) {
	return {
		completed: responses.length,
		skipped: responses.filter((r) => r.skipped).length,
		answered: responses.filter((r) => r.recorded).length,
		hinted: responses.filter((r) => r.hintsUsed > 0).length,
		revealed: responses.filter((r) => r.revealed).length,
		evaluated: responses.filter((r) => r.correct !== undefined).length,
		correct: responses.filter((r) => r.correct === true).length,
		submitted: responses.filter((r) => r.submitted).length,
	};
}
