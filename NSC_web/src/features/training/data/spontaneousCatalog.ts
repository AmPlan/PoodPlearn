import { patientAudioManifest } from "./patientAudioManifest";

export type SpontaneousQuestion = {
	id: string;
	text: string;
	sourceText: string;
	referenceAnswers: string[];
	patientField?:
		| "firstName"
		| "lastName"
		| "province"
		| "gender"
		| "occupation"
		| "birthDay"
		| "birthMonth"
		| "birthYearBE";
};
export type SpontaneousSet = {
	id: string;
	level: "easy" | "medium" | "hard";
	number: number;
	category: string;
	questions: SpontaneousQuestion[];
};
const personal = (gender: string) =>
	`คุณชื่ออะไร|คุณนามสกุลอะไร|บ้านของคุณอยู่ที่จังหวัดอะไร|${gender}|คุณมีอาชีพอะไร|คุณเกิดวันที่เท่าไหร่|คุณเกิดเดือนอะไร|คุณเกิดปีพ.ศ.อะไร|หนึ่งสัปดาห์มีกี่วัน (เจ็ดวัน)|หนึ่งปีมีกี่เดือน (สิบสองเดือน)`;
const definitions = [
	[
		"easy",
		"เรื่องของฉัน",
		[
			personal("คุณเป็นผู้หญิงหรือผู้ชาย"),
			personal("คุณเป็นผู้ชายหรือผู้หญิง"),
			personal("คุณเป็นเพศอะไร"),
		],
	],
	[
		"medium",
		"เติมคำ",
		[
			"เกลือมีรส…(เค็ม)|ใบไม้มีสี…(เขียว)|แอปเปิ้ลเป็นผลไม้ที่มีสี…(แดง)|พระอาทิตย์ขึ้นตอน…(เช้า)|ดินสอใช้สำหรับ…(เขียน)|นกบินอยู่บน…(ฟ้า)|รถวิ่งอยู่บน…(ถนน)|อยากดูละครต้องเปิด…(ทีวี)|อยากรู้เวลาต้องดู…(นาฬิกา)|เสื้อผ้ายับเราต้องใช้…(เตารีด)",
			"น้ำตาลมีรส…(หวาน)|กล้วยเป็นผลไม้ที่มีสี…(เหลือง)|นมวัวมีสี…(ขาว)|พระจันทร์ออกมาตอน…(กลางคืน)|น้ำแข็งทำมาจาก…(น้ำ)|ว่าวลอยอยู่บน…(ฟ้า)|เรือแล่นอยู่ใน…(น้ำ)|มืดแล้วต้องเปิด…(ไฟ)|อยากรู้วันที่ต้องดู…(ปฏิทิน)|ผมยุ่งเราต้องใช้…(หวี)",
			"มะนาวมีรส…(เปรี้ยว)|ส้มเป็นผลไม้ที่มีสี…(ส้ม)|ปลาว่ายอยู่ใน…(น้ำ)|ลูกบอลมีรูปร่าง…(กลม)|ฝนตกทำให้พื้น…(เปียก)|หนังสือใช้สำหรับ…(อ่าน)|เครื่องบินอยู่บน…(ท้องฟ้า)|เรานั่งอยู่บน…(เก้าอี้)|เวลาแต่งตัวต้องส่อง…(กระจก)|ตามองเห็นไม่ชัดต้องใส่…(แว่นตา)",
		],
	],
	[
		"hard",
		"ตอบคำถามและเติมประโยค",
		[
			"ไก่งามเพราะขน คนงามเพราะ…(แต่ง)|คนรักเท่าผืนหนัง คนชังเท่าผืน…(เสื่อ)|คุณทำอะไรเมื่อหิวข้าว (กินข้าว)|ดวงอาทิตย์ขึ้นทางทิศไหน (ทิศตะวันออก)|เรามีนิ้วมือทั้งหมดกี่นิ้ว (สิบนิ้ว)|คุณใช้อะไรแปรงฟัน (แปรงสีฟัน)|หนึ่งวันมีกี่ชั่วโมง (ยี่สิบสี่ชั่วโมง)|เมื่อไม่สบาย ต้องไปที่ไหน (โรงพยาบาล)|ถ้าอยากขึ้นรถไฟต้องไปที่ไหน (สถานีรถไฟ)|จังหวัดลำปางอยู่ภาคอะไรของประเทศไทย (ภาคเหนือ)",
			"ดูช้างให้ดูหาง ดูนางให้ดู…(แม่)|น้ำร้อนปลาเป็น น้ำเย็นปลา…(ตาย)|คุณทำอะไรเมื่อง่วง (นอนหลับ)|ดวงอาทิตย์ตกทางทิศไหน (ทิศตะวันตก)|ดวงอาทิตย์ตกตอนไหน (ตอนเย็น)|ไข่หนึ่งโหลมีกี่ฟอง (สิบสองฟอง)|หนึ่งชั่วโมงมีกี่นาที (หกสิบนาที)|เด็กนักเรียนเรียนหนังสือที่ไหน (โรงเรียน)|ถ้าอยากขึ้นเครื่องบินต้องไปที่ไหน (สนามบิน)|จังหวัดเชียงใหม่อยู่ภาคอะไรของประเทศไทย (ภาคเหนือ)",
			"ตกน้ำไม่ไหล ตกไฟไม่…(ไหม้)|น้ำพึ่งเรือ เสือพึ่ง…(ป่า)|คุณทำอะไรเมื่อหิวน้ำ (กินน้ำ)|ฝนตกมากในฤดูอะไร (ฤดูฝน)|ดวงอาทิตย์ขึ้นตอนไหน (ตอนเช้า)|รถยนต์มีกี่ล้อ (สี่ล้อ)|หนึ่งวันมีกี่ชั่วโมง (ยี่สิบสี่ชั่วโมง)|ตำรวจทำงานที่ไหน (สถานีตำรวจ)|ถ้าอยากไหว้พระทำบุญต้องไปที่ไหน (วัด)|จังหวัดเชียงรายอยู่ภาคอะไรของประเทศไทย (ภาคเหนือ)",
		],
	],
] as const;
const fields = [
	"firstName",
	"lastName",
	"province",
	"gender",
	"occupation",
	"birthDay",
	"birthMonth",
	"birthYearBE",
] as const;

// Strip only the supplied trailing answer annotation; preserve the actual prompt.
export function spontaneousPrompt(source: string) {
	return source.replace(/\s*\([^()]*\)\s*$/, "").trim();
}
export const spontaneousCatalog: SpontaneousSet[] = definitions.flatMap(
	([level, category, sets]) =>
		sets.map((words, index) => {
			const id = `spontaneous-${level}-${index + 1}`;
			return {
				id,
				level,
				category,
				number: index + 1,
				questions: words.split("|").map((sourceText, i) => {
					const answer = sourceText.match(/\(([^()]*)\)\s*$/)?.[1];
					return {
						id: `${id}-${i + 1}`,
						text: spontaneousPrompt(sourceText),
						sourceText,
						referenceAnswers: answer ? [answer] : [],
						patientField: level === "easy" && i < 8 ? fields[i] : undefined,
					};
				}),
			};
		}),
);
export const findSpontaneousSet = (id: string) =>
	spontaneousCatalog.find((set) => set.id === id);
export const spontaneousAudio = (question: SpontaneousQuestion) =>
	patientAudioManifest.spontaneousQuestions[question.id];
export const pendingSpontaneousAudio = (set: SpontaneousSet) =>
	set.questions.filter((question) => !spontaneousAudio(question));
