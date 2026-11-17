"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuthSession } from "@/features/auth/services/authSession";
import { getTodayTrainingPlan } from "../services/trainingPlanService";
import type { TodayTrainingPlan } from "../types/trainingPlan.types";
import { namingButton, namingPage, namingSecondary } from "./NamingLibrary";

export function NamingTrainingLanding() {
	const [plans, setPlans] = useState<TodayTrainingPlan[]>([]);
	const [notice, setNotice] = useState("กำลังตรวจสอบแผนฝึกในระบบ…");
	useEffect(() => {
		let active = true;
		const patientId = getAuthSession()?.user.patientId;
		async function load() {
			if (!patientId) {
				if (active)
					setNotice("เข้าสู่ระบบคนไข้เพื่อดูแผนฝึกของคุณ หรือเลือกฝึกเพิ่มเติมจากคลัง");
				return;
			}
			const result = await getTodayTrainingPlan(patientId);
			if (!active) return;
			if (!result.success) {
				setNotice("ยังโหลดแผนฝึกไม่ได้ กรุณาลองใหม่จากหน้าหลัก");
				return;
			}
			const namingPlans = result.data.filter((plan) =>
				/naming|เรียกชื่อ/i.test(`${plan.categoryName} ${plan.moduleName}`),
			);
			setPlans(namingPlans);
			setNotice(
				namingPlans.length
					? "แผนที่ได้รับจากระบบวันนี้"
					: "ไม่มีแผน Naming ในข้อมูลที่ระบบส่งกลับ สามารถเลือกฝึกเพิ่มเติมได้",
			);
		}
		void load();
		return () => {
			active = false;
		};
	}, []);
	return (
		<main className={namingPage}>
			<div className="mx-auto max-w-4xl">
				<Link href="/patient/home" className={namingSecondary}>
					กลับหน้าหลัก
				</Link>
				<section className="mt-8 rounded-3xl border border-[#c5e2dc] bg-white p-6 shadow-sm sm:p-10">
					<p className="text-lg font-bold text-[#118a82]">พูดเพลิน · Naming</p>
					<h1 className="mt-3 text-3xl font-bold sm:text-4xl">
						แบบฝึกเรียกชื่อภาพ
					</h1>
					<p className="mt-4 text-xl leading-9">
						ดูภาพทีละภาพ แล้วลองพูดชื่อสิ่งที่เห็น
						<br />
						หากยังนึกไม่ออก สามารถขอคำใบ้ ดูเฉลย หรือข้ามได้
					</p>
					<div className="mt-7 rounded-2xl bg-[#edf9f6] p-5">
						<h2 className="text-2xl font-bold">แผนฝึกของคุณ</h2>
						<p role="status" className="mt-3 text-lg leading-8">
							{notice}
						</p>
						{plans.map((plan) => (
							<div
								key={plan.dailyPlanScheduleId}
								className="mt-4 rounded-xl bg-white p-5"
							>
								<p className="text-xl font-bold">{plan.moduleName}</p>
								<p className="mt-2 text-lg">
									{plan.status === "COMPLETED"
										? "ฝึกเสร็จแล้ว"
										: "ชุดฝึกที่ได้รับจากระบบ"}
								</p>
								<Link
									className={`${namingButton} mt-4 w-full`}
									href={`/patient/training/naming/assigned/${encodeURIComponent(plan.assignedSetId)}?schedule=${encodeURIComponent(plan.dailyPlanScheduleId)}`}
								>
									ดูรายละเอียดชุดฝึก
								</Link>
							</div>
						))}
					</div>
					<div className="mt-7 border-t border-[#d7e9e4] pt-6">
						<h2 className="text-2xl font-bold">ฝึกเพิ่มเติม</h2>
						<p className="my-3 text-lg leading-8">
							สัตว์ · ของใช้ · ผักผลไม้/อาหาร
							<br />3 ระดับ รวม 9 ชุด ชุดละ 15 ข้อ
						</p>
						<Link
							href="/patient/training/naming/animals"
							className={`${namingButton} w-full`}
						>
							เปิดคลังแบบฝึก
						</Link>
					</div>
				</section>
			</div>
		</main>
	);
}
