import { namingCatalog } from "./namingCatalog";
import { patientAudioManifest } from "./patientAudioManifest";
import type { StandardAssessmentQuestion } from "@/features/assessment/types/assessment.types";

export type ComprehensionQuestion = StandardAssessmentQuestion & {
	grading: "objective" | "patient" | "context";
	target?: string;
	correctChoiceId?: string;
	expectedBoolean?: boolean;
	personalField?: "name" | "gender" | "occupation" | "province";
	personalizationReady?: boolean;
	sourcePromptText?: string;
};
export type ComprehensionSet = {
	id: string;
	level: "easy" | "medium" | "hard";
	number: number;
	category: string;
	questions: ComprehensionQuestion[];
};
const definitions = [
	[
		"easy",
		"เลือกภาพ",
		[
			"หมา|ปลา|หมู|เสื้อ|ปากกา|เก้าอี้|หวี|กล้วย|องุ่น|ไข่ต้ม",
			"แมว|ไก่|วัว|โต๊ะ|กางเกง|รถยนต์|แปรงสีฟัน|ส้ม|สับปะรด|ไอศกรีม",
			"จระเข้|เป็ด|ช้าง|แก้วน้ำ|พัดลม|รองเท้า|เตียง|แอปเปิ้ล|มะละกอ|น้ำส้ม",
		],
	],
	[
		"medium",
		"ฟังแล้วตอบ",
		[
			"คุณชื่อ (สมหญิง) ใช่หรือไม่|คุณเป็น ผู้ชาย ใช่หรือไม่|คุณเป็น หมอ ใช่หรือไม่|บ้านของคุณอยู่ที่ กรุงเทพ ใช่หรือไม่|บ้านของคุณอยู่ที่ ลำปาง ใช่หรือไม่|ตอนนี้คุณกำลังลืมตา ใช่หรือไม่|คุณกินข้าว เมื่อหิว ใช่หรือไม่|สุนัขมี 4 ขา ใช่หรือไม่|ไฟมีความร้อน ใช่หรือไม่|แมวมีปีก ใช่หรือไม่",
			"คุณชื่อ (สมชาย) ใช่หรือไม่|คุณเป็น ผู้หญิง ใช่หรือไม่|คุณเป็น ตำรวจ ใช่หรือไม่|บ้านของคุณอยู่ที่ กรุงเทพ ใช่หรือไม่|บ้านของคุณอยู่ที่ ลำปาง ใช่หรือไม่|ตอนนี้คุณกำลังหลับตา ใช่หรือไม่|คุณนอนหลับ เมื่อง่วงนอน ใช่หรือไม่|กล้วยสุกมีสีเหลือง ใช่หรือไม่|มะนาวมีรสหวาน ใช่หรือไม่|สุนัขหมายถึงหมา ใช่หรือไม่",
			"คุณชื่อ (สมหมาย) ใช่หรือไม่|คุณเป็น ผู้ชาย ใช่หรือไม่|คุณเป็น ครู ใช่หรือไม่|บ้านของคุณอยู่ที่ กรุงเทพ ใช่หรือไม่|บ้านของคุณอยู่ที่ ลำปาง ใช่หรือไม่|ตอนนี้คุณกำลังหลับตา ใช่หรือไม่|คุณนอนหลับ เมื่อหิว ใช่หรือไม่|แมวร้อง เมี้ยวเมี้ยว ใช่หรือไม่|น้ำแข็งมีความเย็น ใช่หรือไม่|พริกมีรสเปรี้ยว ใช่หรือไม่",
		],
	],
	[
		"hard",
		"ฟังแล้วคิด",
		[
			"ช้างตัวเล็กกว่ามด ใช่หรือไม่|หู ใช้สำหรับฟังเสียง ใช่หรือไม่|มือ ใช้สำหรับหยิบจับสิ่งของ ใช่หรือไม่|แปรงสีฟันใช้สำหรับสระผม ใช่หรือไม่|ร่มใช้สำหรับกันฝน ใช่หรือไม่|โทรศัพท์ใช้สำหรับดูเวลาและคุยสาย ใช่หรือไม่|แว่นตาใช้สำหรับใส่ที่ปาก ใช่หรือไม่|วันเสาร์มาก่อนวันศุกร์ ใช่หรือไม่|เราต้องถุงเท้าก่อนใส่รองเท้า ใช่หรือไม่|เดือนกุมภาพันธ์มาก่อนเดือนกันยายน ใช่หรือไม่",
			"ปลาอาศัยอยู่ในน้ำ ใช่หรือไม่|ตา ใช้สำหรับพูด ใช่หรือไม่|เท้า ใช้สำหรับเดิน ใช่หรือไม่|ช้อนใช้สำหรับตักข้าว ใช่หรือไม่|ผ้าเช็ดตัวใช้สำหรับดื่มน้ำ ใช่หรือไม่|ตู้เย็นใช้สำหรับอุ่นอาหารให้ร้อน ใช่หรือไม่|เราใช้มีดตักข้าว ใช่หรือไม่|พระอาทิตย์ขึ้นทางทิศตะวันตก ใช่หรือไม่|เมื่อฝนตกเราต้องกางร่ม ใช่หรือไม่|เดือนพฤษภาคมมาก่อนเดือนมีนาคม ใช่หรือไม่",
			"นกบินได้ ใช่หรือไม่|จมูก ใช้สำหรับดมกลิ่นและหายใจ ใช่หรือไม่|ปาก ใช้สำหรับมองเห็น ใช่หรือไม่|หมอน ใช้สำหรับจัดแต่งทรงผม ใช่หรือไม่|สบู่ใช้สำหรับทำความสะอาดร่างกาย ใช่หรือไม่|กรรไกรใช้สำหรับตัดกระดาษ ใช่หรือไม่|เราใช้หวีตัดผม ใช่หรือไม่|น้ำเน่าเสียเกิดจากการทิ้งขยะลงแม่น้ำ ใช่หรือไม่|คุณกินส้มโดยไม่ปลอกเปลือก ใช่หรือไม่|อากาศร้อนมากในช่วงเดือนธันวาคม ใช่หรือไม่",
		],
	],
] as const;

// Proposed objective answer key for catalog practice. Live sessions trust backend results.
// No fixed answer for personal questions or the context-dependent December question.
const objectiveKeys: Record<string, (boolean | undefined)[]> = {
	"medium-1": [
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		true,
		true,
		true,
		false,
	],
	"medium-2": [
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		true,
		true,
		false,
		true,
	],
	"medium-3": [
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		false,
		true,
		true,
		false,
	],
	"hard-1": [false, true, true, false, true, true, false, false, true, true],
	"hard-2": [true, false, true, true, false, false, false, false, true, false],
	"hard-3": [
		true,
		true,
		false,
		false,
		true,
		true,
		false,
		true,
		false,
		undefined,
	],
};
const imageChoices = (target: string, id: string) => {
	const set = namingCatalog.find((candidate) =>
		candidate.questions.some((question) => question.answer === target),
	);
	if (!set) return [];
	const index = set.questions.findIndex(
		(question) => question.answer === target,
	);
	return [0, 1, 2].map((offset, i) => ({
		id: `${id}-option-${i + 1}`,
		label: `ภาพตัวเลือก ${i + 1}`,
		imageSrc: set.questions[(index + offset) % set.questions.length].imageSrc,
	}));
};

export const comprehensionCatalog: ComprehensionSet[] = definitions.flatMap(
	([level, category, sets]) =>
		sets.map((words, index) => {
			const id = `comprehension-${level}-${index + 1}`;
			return {
				id,
				level,
				category,
				number: index + 1,
				questions: words.split("|").map((text, i): ComprehensionQuestion => {
					const questionId = `${id}-${i + 1}`;
					const common = {
						id: questionId,
						order: i + 1,
						category: "comprehension" as const,
						categoryLabel: category,
						questionAudioSrc:
							patientAudioManifest.comprehensionQuestions[questionId],
					};
					if (level === "easy")
						return {
							...common,
							target: text,
							promptText: `ชี้ภาพ${text}`,
							interactionType: "image_choice",
							grading: "objective",
							choices: imageChoices(text, questionId),
							correctChoiceId: `${questionId}-option-1`,
						};
					const personalField =
						level === "medium" && i < 5
							? (
									[
										"name",
										"gender",
										"occupation",
										"province",
										"province",
									] as const
								)[i]
							: undefined;
					const template =
						personalField === "name"
							? "คุณชื่อ … ใช่หรือไม่"
							: personalField === "province"
								? "บ้านของคุณอยู่ที่ … ใช่หรือไม่"
								: "คุณเป็น … ใช่หรือไม่";
					return {
						...common,
						sourcePromptText: text,
						promptText: personalField ? template : text,
						personalField,
						personalizationReady: !personalField,
						questionAudioSrc: personalField
							? undefined
							: common.questionAudioSrc,
						interactionType: "yes_no_choice",
						grading:
							level === "medium" && i < 6
								? i === 5
									? "context"
									: "patient"
								: level === "hard" && index === 2 && i === 9
									? "context"
									: "objective",
						expectedBoolean: objectiveKeys[`${level}-${index + 1}`][i],
						choices: [
							{ id: "yes", label: "ใช่" },
							{ id: "no", label: "ไม่ใช่" },
						],
					};
				}),
			};
		}),
);
export const findComprehensionSet = (id: string) =>
	comprehensionCatalog.find((set) => set.id === id);
export const pendingComprehensionAudio = (set: ComprehensionSet) =>
	set.questions.filter((question) => !question.questionAudioSrc);
export const pendingComprehensionData = (set: ComprehensionSet) =>
	set.questions.filter(
		(question) => question.personalField && !question.personalizationReady,
	);
export function evaluateComprehensionChoice(
	question: ComprehensionQuestion,
	choiceId?: string,
): boolean | undefined {
	if (!question.choices?.some((choice) => choice.id === choiceId))
		throw new Error("กรุณาเลือกคำตอบ");
	if (question.personalField && !question.personalizationReady)
		throw new Error("รอคำถามของคุณ");
	if (question.grading !== "objective") return undefined;
	if (question.interactionType === "image_choice")
		return question.correctChoiceId === choiceId;
	return typeof question.expectedBoolean === "boolean"
		? question.expectedBoolean === (choiceId === "yes")
		: undefined;
}
