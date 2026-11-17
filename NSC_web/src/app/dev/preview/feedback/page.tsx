"use client";
import { useState } from "react";
import { PracticeFeedback } from "@/features/training/components/PracticeFeedback";
import type { PracticeCue } from "@/features/training/hooks/usePracticeFlow";
import { chooseEncouragement } from "@/features/training/services/practiceFlow";
import {
	namingButton,
	namingPage,
} from "@/features/training/components/NamingLibrary";
export default function Page() {
	const [cue, setCue] = useState<PracticeCue | null>(null);
	return (
		<main className={namingPage}>
			<section className="mx-auto max-w-xl rounded-3xl bg-white p-6">
				<h1 className="mb-6 text-3xl font-bold">ตัวอย่างหน้าตอบกลับ</h1>
				<p className="mb-5 text-lg">เลือกดูหน้าจอเท่านั้น ไม่ใช่ผลตรวจจริง</p>
				<div className="grid gap-4">
					<button
						className={namingButton}
						onClick={() => setCue({ kind: "correct", text: "ถูกต้องค่ะ" })}
					>
						ตัวอย่างตอบถูก
					</button>
					<button
						className={namingButton}
						onClick={() =>
							setCue({ kind: "wrong", text: "ไม่เป็นไร ไปต่อกันนะคะ" })
						}
					>
						ตัวอย่างให้กำลังใจ
					</button>
					<button
						className={namingButton}
						onClick={() =>
							setCue({
								kind: "milestone",
								text: chooseEncouragement(5, 30).text,
							})
						}
					>
						ตัวอย่างครบ 5 ข้อ
					</button>
				</div>
				<PracticeFeedback cue={cue} onContinue={() => setCue(null)} />
			</section>
		</main>
	);
}
