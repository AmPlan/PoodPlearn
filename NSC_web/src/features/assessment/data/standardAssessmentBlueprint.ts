import type {
	StandardAssessmentQuestion,
	StandardAssessmentSession,
} from "../types/assessment.types";
import {
	namingCatalog,
	NAMING_PROMPT_AUDIO,
} from "@/features/training/data/namingCatalog";
import { patientAudioManifest } from "@/features/training/data/patientAudioManifest";

// Owner-supplied order; these are frontend IDs, not database IDs or a rubric.
export const standardAssessmentText = [
	"คุณชื่ออะไร",
	"คุณนามสกุลอะไร",
	"บ้านของคุณอยู่ที่จังหวัดอะไร",
	"หนึ่งสัปดาห์มีกี่วัน",
	"เกลือมีรส…",
	"คุณทำอะไรเมื่อหิวข้าว",
	"กล้วย",
	"เก้าอี้",
	"แมว",
	"พัดลม",
	"คุณเป็น ผู้ชาย ใช่หรือไม่",
	"บ้านของคุณอยู่ที่ ลำปาง ใช่หรือไม่",
	"ช้างตัวเล็กกว่ามด ใช่หรือไม่",
	"เดือนพฤษภาคมมาก่อนเดือนมีนาคม ใช่หรือไม่",
	"คุณกินส้มโดยไม่ปลอกเปลือก ใช่หรือไม่",
	"อากาศร้อนมากในช่วงเดือนธันวาคม ใช่หรือไม่",
	"เตียง",
	"แตงโม",
	"โทรศัพท์",
	"รถติดบนถนน",
	"เมื่อคืนฝนตกหนักมาก",
	"แม่ไปซื้อกับข้าวที่ตลาด",
	"การฝึกพูดทุกวันช่วยให้พูดเก่งขึ้น",
	"แมว",
	"จระเข้",
	"กางเกง",
	"หวี",
	"โทรศัพท์",
	"แอปเปิ้ล",
	"ไข่ต้ม",
] as const;

const mediaFor = (answer: string) =>
	namingCatalog
		.flatMap((set) => set.questions)
		.find((question) => question.answer === answer);
const knownSpontaneousAnswers: Record<number, string> = {
	4: "เจ็ดวัน",
	5: "เค็ม",
	6: "กินข้าว",
};

// Owner permits choosing distractors. Reuse existing images without generating assets.
export const assessmentImageChoices: Record<number, string[]> = {
	7: ["กล้วย", "แอปเปิ้ล", "ส้ม"],
	8: ["เก้าอี้", "โต๊ะ", "เตียง"],
	9: ["แมว", "หมา", "กระต่าย"],
	10: ["พัดลม", "โทรทัศน์", "ตู้เย็น"],
};

export const standardAssessmentQuestions: StandardAssessmentQuestion[] =
	standardAssessmentText.map((text, index) => {
		const order = index + 1;
		const base = {
			id: `standard-ui-${order}`,
			order,
			questionAudioSrc:
				patientAudioManifest.assessmentQuestions[`standard-ui-${order}`],
		};
		if (order <= 6)
			return {
				...base,
				category: "spontaneous",
				categoryLabel: "พูดตอบ",
				interactionType: "voice_question",
				promptText: text,
				expectedAnswer: knownSpontaneousAnswers[order],
			};
		if (order <= 10)
			return {
				...base,
				category: "comprehension",
				categoryLabel: "ชี้ภาพ",
				interactionType: "image_choice",
				promptText: `ชี้ภาพ${text}`,
				expectedAnswer: text,
				choices: assessmentImageChoices[order].map((answer, choiceIndex) => ({
					id: `standard-ui-${order}-choice-${choiceIndex + 1}`,
					label: `ภาพตัวเลือก ${choiceIndex + 1}`,
					imageSrc: mediaFor(answer)?.imageSrc,
				})),
			};
		if (order <= 16)
			return {
				...base,
				category: "comprehension",
				categoryLabel: "ฟังและเข้าใจ",
				interactionType: "yes_no_choice",
				promptText: text,
				choices: [
					{ id: "yes", label: "ใช่" },
					{ id: "no", label: "ไม่ใช่" },
				],
			};
		if (order <= 23)
			return {
				...base,
				category: "repetition",
				categoryLabel: "พูดตาม",
				interactionType: "repeat_after",
				promptText: text,
				expectedAnswer: text,
				// Gemini recording slot is inherited from base; currently unfilled.
			};
		return {
			...base,
			category: "naming",
			categoryLabel: "เรียกชื่อภาพ",
			interactionType: "name_image",
			promptText: "ภาพนี้คืออะไร",
			expectedAnswer: text,
			imageSrc: mediaFor(text)?.imageSrc,
			questionAudioSrc: base.questionAudioSrc ?? NAMING_PROMPT_AUDIO,
		};
	});

export const standardAssessmentPreview: StandardAssessmentSession = {
	sessionId: "frontend-preview-standard-30",
	totalQuestions: standardAssessmentQuestions.length,
	questions: standardAssessmentQuestions,
};
export const assessmentMediaPending = {
	imageChoiceOrders: standardAssessmentQuestions
		.filter(
			(question) =>
				question.interactionType === "image_choice" &&
				(!question.choices?.length ||
					question.choices.some(
						(choice) => !choice.imageSrc && !choice.imageUrl,
					)),
		)
		.map((question) => question.order),
	audioOrders: standardAssessmentQuestions
		.filter((question) => !question.questionAudioSrc)
		.map((question) => question.order),
};
