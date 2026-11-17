"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Image as Picture, Play } from "lucide-react";
import { getAuthSession } from "@/features/auth/services/authSession";
import { getTodayTrainingPlan } from "../services/trainingPlanService";
import type { TodayTrainingPlan } from "../types/trainingPlan.types";
import { namingButton, namingPage, namingSecondary } from "./NamingLibrary";
export function NamingTrainingLanding() {
	const [plans, setPlans] = useState<TodayTrainingPlan[]>([]);
	const [notice, setNotice] = useState("กำลังโหลด…");
	useEffect(() => {
		let active = true;
		async function load() {
			const patientId = getAuthSession()?.user.patientId;
			if (!patientId) {
				if (active) setNotice("กรุณาเข้าสู่ระบบคนไข้");
				return;
			}
			const result = await getTodayTrainingPlan(patientId);
			if (!active) return;
			if (!result.success) {
				setNotice("ยังโหลดแผนไม่ได้ กรุณากลับหน้าหลัก");
				return;
			}
			const namingPlans = result.data.filter(
				(plan) =>
					/naming|เรียกชื่อ/i.test(`${plan.categoryName} ${plan.moduleName}`) &&
					plan.status !== "COMPLETED",
			);
			setPlans(namingPlans);
			setNotice(namingPlans.length ? "" : "วันนี้ไม่มีชุดเรียกชื่อภาพที่รอฝึก");
		}
		void load();
		return () => {
			active = false;
		};
	}, []);
	return (
		<main className={namingPage}>
			<div className="mx-auto max-w-2xl">
				<Link href="/patient/home" className={`${namingSecondary} gap-2`}>
					<ArrowLeft aria-hidden="true" />
					กลับ
				</Link>
				<section className="mt-5 rounded-3xl bg-white p-6 text-center sm:p-10">
					<Picture
						aria-hidden="true"
						className="mx-auto h-20 w-20 text-[#118a82]"
					/>
					<h1 className="mt-4 text-3xl font-bold">เรียกชื่อภาพ</h1>
					{notice && (
						<p role="status" className="mt-4 text-xl">
							{notice}
						</p>
					)}
					{plans.map((plan, i) => (
						<Link
							key={plan.dailyPlanScheduleId}
							className={`${namingButton} mt-6 min-h-20 w-full gap-3`}
							href={`/patient/training/naming/assigned/${encodeURIComponent(plan.assignedSetId)}?schedule=${encodeURIComponent(plan.dailyPlanScheduleId)}`}
						>
							<Play aria-hidden="true" className="h-8 w-8" />
							{plans.length > 1 ? `ฝึกชุดที่ ${i + 1}` : "เริ่มฝึก"}
						</Link>
					))}
					<details className="mt-7 text-left text-base leading-7 text-[#526a66]">
						<summary className="cursor-pointer py-3">สำหรับผู้ดูแล</summary>
						<p>รายการด้านบนมาจากแผนฝึกในระบบ ไม่ได้คำนวณผลประเมินใหม่ที่หน้าเว็บ</p>
						<Link
							href="/patient/training/naming/animals"
							className={`${namingSecondary} mt-4 w-full`}
						>
							คลังฝึกเพิ่มเติม
						</Link>
					</details>
				</section>
			</div>
		</main>
	);
}
