"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Image as Picture, Play } from "lucide-react";
import { getAuthSession } from "@/features/auth/services/authSession";
import { patientTrainingTitle } from "@/features/patient/services/patientTrainingPresentation";
import { getTodayTrainingPlan } from "../services/trainingPlanService";
import type { TodayTrainingPlan } from "../types/trainingPlan.types";
import { namingButton, namingPage, namingSecondary } from "./NamingLibrary";

export function TodayTrainingClient() {
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
				setNotice("ยังโหลดแผนไม่ได้ กรุณากลับแล้วลองใหม่");
				return;
			}
			setPlans(result.data);
			setNotice(result.data.length ? "" : "ยังไม่มีชุดฝึกวันนี้");
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
				<h1 className="my-6 text-3xl font-bold">แบบฝึกวันนี้</h1>
				{notice && (
					<p role="status" className="text-xl">
						{notice}
					</p>
				)}
				<div className="grid gap-5">
					{plans.map((plan) => {
						const naming = /naming|เรียกชื่อ/i.test(
							`${plan.categoryName} ${plan.moduleName}`,
						);
						const completed = plan.status === "COMPLETED";
						const repetition = /repetition|พูดตาม/i.test(
							`${plan.categoryName} ${plan.moduleName}`,
						);
						const comprehension = /comprehension|ความเข้าใจ|ฟังและเข้าใจ/i.test(
							`${plan.categoryName} ${plan.moduleName}`,
						);
						return (
							<section
								key={plan.dailyPlanScheduleId}
								className="rounded-3xl bg-white p-6 shadow-sm"
							>
								<h2 className="flex items-center gap-3 text-2xl font-bold">
									{completed ? (
										<Check
											aria-hidden="true"
											className="h-10 w-10 text-[#118a82]"
										/>
									) : (
										<Picture
											aria-hidden="true"
											className="h-10 w-10 text-[#118a82]"
										/>
									)}
									{patientTrainingTitle(
										`${plan.categoryName} ${plan.moduleName}`,
									)}
								</h2>
								{completed ? (
									<p className="mt-4 text-xl text-[#118a82]">ฝึกแล้ว</p>
								) : naming || repetition || comprehension ? (
									<Link
										href={`/patient/training/${repetition ? "repetition" : comprehension ? "comprehension" : "naming"}/assigned/${encodeURIComponent(plan.assignedSetId)}?schedule=${encodeURIComponent(plan.dailyPlanScheduleId)}`}
										className={`${namingButton} mt-5 min-h-20 w-full gap-3`}
									>
										<Play aria-hidden="true" className="h-8 w-8" />
										เริ่มฝึก
									</Link>
								) : (
									<p className="mt-4 text-lg text-[#526a66]">
										ชุดฝึกนี้ยังไม่พร้อมเปิดใช้งาน
									</p>
								)}
							</section>
						);
					})}
				</div>
			</div>
		</main>
	);
}
