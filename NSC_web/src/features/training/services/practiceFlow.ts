export type QuestionStatus = "pending" | "skipped" | "answered";
export type PracticeEntry<T> = { status: QuestionStatus; response?: T };

export function nextUnanswered<T>(
	entries: PracticeEntry<T>[],
	current: number,
): number | null {
	for (let step = 1; step <= entries.length; step++) {
		const index = (current + step) % entries.length;
		if (entries[index].status !== "answered") return index;
	}
	return null;
}

const messages = [
	{ id: "great", text: "เก่งมากค่ะ" },
	{ id: "well-done", text: "ทำได้ดีมากค่ะ" },
	{ id: "wonderful", text: "เยี่ยมเลยค่ะ" },
	{ id: "keep-going", text: "ค่อย ๆ ทำไปด้วยกันนะคะ" },
	{ id: "proud", text: "ตั้งใจฝึกได้ดีมากค่ะ" },
];
export function chooseEncouragement(
	completed: number,
	total: number,
	previousId?: string,
	random = Math.random,
) {
	const pool =
		completed >= total - 5 && completed < total
			? [...messages, { id: "almost", text: "อีกนิดเดียวจะครบแล้วค่ะ" }]
			: messages;
	const available = pool.filter((message) => message.id !== previousId);
	const chosen =
		available[
			Math.min(
				available.length - 1,
				Math.floor(Math.max(0, random()) * available.length),
			)
		];
	return {
		...chosen,
		completed,
		text: `${chosen.text} ทำครบ ${completed} ข้อแล้วนะคะ`,
	};
}
