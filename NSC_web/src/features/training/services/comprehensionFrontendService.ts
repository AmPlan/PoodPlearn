import {
	comprehensionCatalog,
	type ComprehensionQuestion,
	type ComprehensionSet,
} from "../data/comprehensionCatalog";
import { namingCatalog } from "../data/namingCatalog";
import { approvedPatientAudio } from "../data/patientAudioManifest";
import type { AssessmentAnswer } from "@/features/assessment/types/assessment.types";

export type ComprehensionRunSet = ComprehensionSet & {
	backendSetId?: string;
	questionIds?: string[];
};
type ApiQuestion = {
	questionId: number;
	orderIndex?: number;
	question: {
		questionType: string;
		comprehensionImageQuestions?: {
			questionText?: string | null;
			correctImageUrl?: string | null;
			wrongImageUrl1?: string | null;
			wrongImageUrl2?: string | null;
		}[];
		ComprehensionQuestion?: {
			questionText?: string | null;
			resolvedQuestionText?: string;
			personalizationComplete?: boolean;
			resolvedQuestionAudioSrc?: string;
		}[];
	};
};
const normalize = (value: string) =>
	value.normalize("NFC").replace(/\s+/g, "").trim();
const numericId = (id: string) => {
	if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))
		throw new Error("กรุณาตรวจสอบรหัสชุดฝึก");
	return Number(id);
};
async function request<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, { ...init, cache: "no-store" });
	const body = await response.json().catch(() => null);
	if (!response.ok || !body || body.error)
		throw new Error("กรุณาลองเชื่อมต่อระบบฝึกอีกครั้ง");
	return body as T;
}
export function matchComprehensionSet(
	body: { setQuestions?: ApiQuestion[] },
	backendSetId: string,
): ComprehensionRunSet {
	const questions = body.setQuestions ?? [];
	const matches = (item: ComprehensionQuestion, q: ApiQuestion) => {
		const image = item.interactionType === "image_choice";
		if (
			q.question.questionType !==
			(image ? "COMPREHENSION_IMAGE" : "COMPREHENSION")
		)
			return false;
		if (item.personalField) return q.orderIndex === item.order;
		const text = image
			? q.question.comprehensionImageQuestions?.[0]?.questionText
			: q.question.ComprehensionQuestion?.[0]?.questionText;
		return (
			typeof text === "string" &&
			(normalize(text) === normalize(item.promptText) ||
				(image && normalize(text) === normalize(item.target ?? "")))
		);
	};
	const set = comprehensionCatalog.find(
		(candidate) =>
			candidate.questions.length === questions.length &&
			new Set(questions.map((q) => q.questionId)).size === questions.length &&
			candidate.questions.every(
				(item) => questions.filter((q) => matches(item, q)).length === 1,
			),
	);
	if (!set) throw new Error("กรุณาให้นักแก้ไขการพูดตรวจชุดฝึกให้ตรงกับรายการ 10 ข้อ");
	const ids = set.questions.map(
		(item) => questions.find((q) => matches(item, q))!,
	);
	if (new Set(ids.map((q) => q.questionId)).size !== set.questions.length)
		throw new Error("กรุณาตรวจรายการข้อสอบให้ครบทุกข้อ");
	const knownImages = new Set(
		namingCatalog.flatMap((candidate) =>
			candidate.questions.map((item) => item.imageSrc),
		),
	);
	const mapped = set.questions.map((item, i) => {
		if (item.personalField) {
			const detail = ids[i].question.ComprehensionQuestion?.[0];
			const resolved = detail?.resolvedQuestionText?.trim();
			const ready =
				detail?.personalizationComplete === true &&
				Boolean(resolved) &&
				!/[{}…]|\.{2,}/.test(resolved ?? "");
			return {
				...item,
				promptText: ready ? resolved! : item.promptText,
				personalizationReady: ready,
				questionAudioSrc: ready
					? approvedPatientAudio(detail?.resolvedQuestionAudioSrc)
					: undefined,
			};
		}
		if (item.interactionType !== "image_choice") return item;
		const data = ids[i].question.comprehensionImageQuestions?.[0];
		const images = [
			data?.correctImageUrl,
			data?.wrongImageUrl1,
			data?.wrongImageUrl2,
		];
		const target = item.choices?.find(
			(choice) => choice.id === item.correctChoiceId,
		)?.imageSrc;
		if (
			images[0] !== target ||
			new Set(images).size !== 3 ||
			images.some((src) => !src || !knownImages.has(src))
		)
			throw new Error("กรุณาให้นักแก้ไขการพูดตรวจภาพตัวเลือกให้ตรงกับภาพ Naming");
		return {
			...item,
			choices: images.map((imageSrc, index) => ({
				id: `${item.id}-option-${index + 1}`,
				label: `ภาพตัวเลือก ${index + 1}`,
				imageSrc: imageSrc!,
			})),
		};
	});
	return {
		...set,
		questions: mapped,
		backendSetId,
		questionIds: ids.map((q) => String(q.questionId)),
	};
}
export async function loadAssignedComprehensionSet(id: string) {
	numericId(id);
	return matchComprehensionSet(
		await request<{ setQuestions?: ApiQuestion[] }>(
			`/api/v1/training-sets/${id}`,
		),
		id,
	);
}
export async function startComprehensionSession(
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
	if (!body.data?.sessionId) throw new Error("กรุณาลองเริ่มฝึกอีกครั้ง");
	return String(body.data.sessionId);
}
export async function sendComprehensionResponse(
	sessionId: string,
	backendQuestionId: string,
	question: ComprehensionQuestion,
	answer: AssessmentAnswer,
) {
	numericId(sessionId);
	numericId(backendQuestionId);
	const choice = question.choices?.find(
		(option) => option.id === answer.selectedOptionId,
	);
	if (!choice) throw new Error("กรุณาเลือกคำตอบ");
	if (question.personalField && !question.personalizationReady)
		throw new Error("รอคำถามของคุณ");
	const form = new FormData();
	form.append("questionId", backendQuestionId);
	form.append(
		"responseTime",
		String(Math.max(0, answer.responseTimeMs ?? 0) / 1000),
	);
	form.append("hintsUsed", "0");
	if (question.interactionType === "image_choice") {
		if (!choice.imageSrc) throw new Error("กรุณาเลือกภาพที่พร้อมใช้งาน");
		form.append("answerImageUrl", choice.imageSrc);
	} else form.append("answerBoolean", String(choice.id === "yes"));
	const body = await request<{ isCorrect?: boolean }>(
		`/api/v1/sessions/${sessionId}/items`,
		{ method: "POST", body: form },
	);
	return {
		correct: typeof body.isCorrect === "boolean" ? body.isCorrect : undefined,
	};
}
export async function finishComprehensionSession(
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
