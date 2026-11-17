import {
	spontaneousCatalog,
	type SpontaneousSet,
	spontaneousPrompt,
} from "../data/spontaneousCatalog";

export type SpontaneousRunSet = SpontaneousSet & {
	backendSetId?: string;
	questionIds?: string[];
};
type ApiSet = {
	setQuestions?: {
		questionId: number;
		question: {
			questionType: string;
			spontaneousQuestions?: { questionText?: string | null }[];
		};
	}[];
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, { ...init, cache: "no-store" });
	const body = await response.json().catch(() => null);
	if (!response.ok || !body || body.error)
		throw new Error(body?.error || "เชื่อมต่อระบบฝึกไม่ได้ กรุณาลองอีกครั้ง");
	return body as T;
}
const numericId = (id: string) => {
	if (!/^[1-9]\d*$/.test(id)) throw new Error("รหัสชุดฝึกหรือเซสชันไม่ถูกต้อง");
	return Number(id);
};

export function matchSpontaneousSet(
	body: ApiSet,
	backendSetId: string,
): SpontaneousRunSet {
	const questions = body.setQuestions ?? [];
	const text = (q: (typeof questions)[number]) =>
		spontaneousPrompt(q.question.spontaneousQuestions?.[0]?.questionText ?? "")
			.normalize("NFC")
			.trim();
	const set = spontaneousCatalog.find(
		(candidate) =>
			candidate.questions.length === questions.length &&
			questions.every((q) => q.question.questionType === "SPONTANEOUS") &&
			new Set(questions.map((q) => q.questionId)).size === questions.length &&
			candidate.questions.every(
				(item) => questions.filter((q) => text(q) === item.text).length === 1,
			),
	);
	if (!set)
		throw new Error("ชุดพูดตอบในระบบยังไม่ตรงกับรายการ 10 ข้อ กรุณาติดต่อนักแก้ไขการพูด");
	return {
		...set,
		backendSetId,
		questionIds: set.questions.map((item) =>
			String(questions.find((q) => text(q) === item.text)!.questionId),
		),
	};
}

export async function loadAssignedSpontaneousSet(id: string) {
	numericId(id);
	return matchSpontaneousSet(
		await request<ApiSet>(`/api/v1/training-sets/${id}`),
		id,
	);
}
export async function startSpontaneousSession(
	setId: string,
	patientId: number,
	schedule?: string,
) {
	const body = await request<{ data?: { sessionId?: number } }>(
		"/api/v1/sessions",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				setId: numericId(setId),
				patientId,
				dailyPlanScheduleId: schedule ? numericId(schedule) : undefined,
			}),
		},
	);
	if (!body.data?.sessionId) throw new Error("ยังเริ่มฝึกไม่ได้ กรุณาลองอีกครั้ง");
	return String(body.data.sessionId);
}
export async function sendSpontaneousResponse(
	sessionId: string,
	questionId: string,
	blob: Blob,
	responseTimeMs: number,
	hintsUsed = 0,
) {
	numericId(sessionId);
	numericId(questionId);
	if (!blob.size) throw new Error("กรุณาบันทึกเสียงก่อน");
	const form = new FormData();
	form.append("questionId", questionId);
	form.append("voiceFile", blob);
	form.append("responseTime", String(Math.max(0, responseTimeMs) / 1000));
	form.append("hintsUsed", String(hintsUsed));
	const body = await request<{ isCorrect?: boolean }>(
		`/api/v1/sessions/${sessionId}/items`,
		{ method: "POST", body: form },
	);
	return {
		correct: typeof body.isCorrect === "boolean" ? body.isCorrect : undefined,
	};
}
export async function finishSpontaneousSession(
	sessionId: string,
	schedule?: string,
) {
	numericId(sessionId);
	await request(`/api/v1/sessions/${sessionId}/complete`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			dailyPlanScheduleId: schedule ? numericId(schedule) : undefined,
		}),
	});
}
