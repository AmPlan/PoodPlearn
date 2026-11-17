// Internal difficulty values stay available to backend/therapist code only.
export function patientTrainingTitle(value: string) {
	if (/naming|เรียกชื่อ/i.test(value)) return "เรียกชื่อภาพ";
	if (/spontaneous|เล่าเรื่อง|พูดตอบ/i.test(value)) return "พูดเล่าเรื่อง";
	if (/repetition|พูดตาม/i.test(value)) return "พูดตาม";
	if (/comprehension|ความเข้าใจ|ฟัง/i.test(value)) return "ฟังและเข้าใจ";
	return (
		value
			.replace(/(?:ระดับ\s*)?(?:ปานกลาง|ง่าย|ยาก|easy|medium|hard)/gi, "")
			.replace(/\s+/g, " ")
			.trim() || "แบบฝึกวันนี้"
	);
}
