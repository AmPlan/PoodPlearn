"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { getStandardAssessmentResult } from "../services/standardAssessmentService";
import type { StandardAssessmentResult } from "../types/assessment.types";
export function AssessmentResultClient() {
	const router = useRouter();
	const [result, setResult] = useState<StandardAssessmentResult | null>(null);
	const [error, setError] = useState("");
	useEffect(() => {
		let active = true;
		async function load() {
			try {
				const response = await getStandardAssessmentResult();
				if (!active) return;
				if (!response.success) throw new Error(response.errorMessage);
				setResult(response.data);
			} catch {
				if (active) setError("ยังสรุปผลไม่ได้ กรุณาลองใหม่ภายหลัง");
			}
		}
		void load();
		return () => {
			active = false;
		};
	}, []);
	return (
		<main className="flex min-h-dvh items-center justify-center bg-[#edf9f6] p-5 text-[#173d3f]">
			<section className="w-full max-w-xl rounded-3xl bg-white p-6 text-center shadow-sm sm:p-10">
				{error ? (
					<p role="alert" className="text-xl text-amber-900">
						{error}
					</p>
				) : !result ? (
					<p role="status" className="text-xl">
						กำลังสรุป…
					</p>
				) : (
					<>
						<Check
							aria-hidden="true"
							className="mx-auto h-28 w-28 rounded-full bg-[#e0f5eb] p-5 text-[#118a82]"
						/>
						<h1 className="mt-6 text-3xl font-bold">ประเมินเสร็จแล้ว</h1>
						<p className="mt-3 text-xl">ขอบคุณที่ตั้งใจทำ</p>
						<details className="mt-6 text-left text-base leading-8 text-[#526a66]">
							<summary className="cursor-pointer py-3">ข้อมูลสำหรับผู้ดูแล</summary>
							<p>
								ทำครบ {result.completedQuestions} จาก {result.totalQuestions} ข้อ
								ข้อมูลแผนฝึกครั้งถัดไปจะแสดงเมื่อระบบส่งกลับในหน้าหลัก
							</p>
						</details>
					</>
				)}
				<button
					onClick={() => router.push("/patient/home")}
					className="mt-7 inline-flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl bg-[#118a82] px-6 text-2xl font-bold text-white focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
				>
					กลับหน้าหลัก
					<ArrowRight aria-hidden="true" className="h-8 w-8" />
				</button>
			</section>
		</main>
	);
}
