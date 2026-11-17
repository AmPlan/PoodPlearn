import { patientAudioManifest } from "./patientAudioManifest";

export type RepetitionQuestion = { id: string; text: string };
export type RepetitionSet = {
	id: string;
	level: "easy" | "medium" | "hard";
	number: number;
	category: string;
	questions: RepetitionQuestion[];
};

// Owner-supplied wording and order. Level is internal, never a patient label.
const definitions = [
	[
		"easy",
		"คำ",
		[
			"หมา|ปลา|หมู|เสื้อ|หวี|เก้าอี้|ปากกา|กล้วยหอม|กินข้าว|ไข่ต้ม",
			"แมว|ไก่|วัว|โต๊ะ|ส้ม|รถยนต์|ช้อนส้อม|กางเกง|ดอกไม้|อาบน้ำ",
			"เตียง|เป็ด|ช้าง|ข้าว|สิบ|เครื่องบิน|แปรงฟัน|แก้วน้ำ|พัดลม|รองเท้า",
		],
	],
	[
		"medium",
		"วลี",
		[
			"แปรงสีฟัน|มะละกอ|วิทยุ|กากบาท|หนึ่งร้อยห้าสิบ|ฉันสบายดี|วันนี้วันเสาร์|โทรศัพท์ดังแล้ว|สี่เหลี่ยมจตุรัส|เด็กๆไปเดินเล่น",
			"สับปะรด|จระเข้|โทรทัศน์|ไม้ขีดไฟ|สองร้อยเจ็ดสิบ|อากาศร้อนมาก|ท้องฟ้ามืดแล้ว|แม่กลับมาถึงบ้าน|สี่สิบห้าเปอร์เซ็นต์|น้ำในแก้วหมดแล้ว",
			"ไอศกรีม|รองเท้าแตะ|โทรศัพท์|หัวแม่มือ|ร้อยแปดสิบสาม|ผมกินข้าวแล้ว|สุนัขเห่าดัง|คุณหมอนัดตอนเช้า|น้องสาวทำการบ้าน|รถติดบนถนน",
		],
	],
	[
		"hard",
		"ประโยค",
		[
			"ดอกไม้ในสวนสวยงาม|วันนี้ท้องฟ้าแจ่มใส|สุนัขที่บ้านตัวใหญ่มาก|ตอนเช้าอากาศเย็นสบาย|แม่ครัวทำต้มยำกุ้งน้ำข้น|โรงพยาบาลอยู่ไม่ไกลมาก|ฉันเดินเล่นที่สวนสาธารณะ|ต้นไม้ใหญ่ให้ร่มเงาเย็นสบาย|การออกกำลังกายดีต่อสุขภาพ|พระธาตุลำปางหลวงอยู่ที่จังหวัดลำปาง",
			"พรุ่งนี้ฉันจะไปเที่ยว|ฉันชอบดื่มน้ำมะนาว|ฉันตื่นนอนตอนหกโมงเช้า|นกกาเกาะอยู่บนกิ่งไม้|ฉันชอบกินผลไม้รสเปรี้ยว|แม่ไปซื้อกับข้าวที่ตลาด|แสงแดดตอนเช้าส่องเข้ามาในห้อง|สุนัขที่บ้านของฉันตัวใหญ่มาก|พรุ่งนี้เช้าฉันจะไปโรงพยาบาล|การฝึกพูดทุกวันช่วยให้พูดชัดขึ้น",
			"คุณหมอบอกให้พักผ่อน|เมื่อคืนฝนตกหนักมาก|ฉันลืมกุญแจไว้บนโต๊ะ|แม่บ้านทำความสะอาดบ้าน|วันนี้ฉันเดินได้เยอะขึ้นมาก|พรุ่งนี้ครอบครัวจะมาเยี่ยมฉัน|ล้างมือให้สะอาดก่อนกินอาหาร|ฉันชอบนั่งฟังเพลงเก่าเก่าตอนเช้า|เด็กนักเรียนดีใจเมื่อได้รับคำชม|การฝึกพูดทุกวันช่วยให้พูดเก่งขึ้น",
		],
	],
] as const;

export const repetitionCatalog: RepetitionSet[] = definitions.flatMap(
	([level, category, sets]) =>
		sets.map((words, index) => {
			const id = `repetition-${level}-${index + 1}`;
			return {
				id,
				level,
				category,
				number: index + 1,
				questions: words
					.split("|")
					.map((text, i) => ({ id: `${id}-${i + 1}`, text })),
			};
		}),
);
export const findRepetitionSet = (id: string) =>
	repetitionCatalog.find((set) => set.id === id);
export const repetitionAudio = (question: RepetitionQuestion) =>
	patientAudioManifest.repetitionQuestions[question.id];
export const pendingRepetitionAudio = (set: RepetitionSet) =>
	set.questions.filter((question) => !repetitionAudio(question));
