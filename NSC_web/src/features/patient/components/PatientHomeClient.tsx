"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JSX, MouseEvent } from "react";
import { useEffect, useState } from "react";
import {
	clearAuthSession,
	getAuthSession,
} from "@/features/auth/services/authSession";
import { createNamingSession } from "@/features/training/services/pn002NamingService";
import { getTodayTrainingPlan } from "@/features/training/services/trainingPlanService";
import { getPatientHomeData } from "../services/patientHomeService";
import type {
	PatientHomeData,
	WeekStreakDay,
} from "../types/patientHome.types";

function WeekStreak({ days }: { days: WeekStreakDay[] }) {
	return (
		<div
			className="flex items-center justify-between gap-1.5 rounded-3xl bg-[#F3FBFB] px-4 py-4"
			role="list"
			aria-label="การฝึก 7 วันล่าสุด"
		>
			{days.map((day, index) => (
				<div
					key={`${day.label}-${index}`}
					className="flex flex-col items-center gap-2.5"
					role="listitem"
				>
					<span
						className={
							"text-sm font-bold sm:text-base " +
							(day.isToday ? "text-[#178F84]" : "text-[#7A9A9C]")
						}
					>
						{day.label}
					</span>
					<span
						className={
							"flex h-12 w-12 items-center justify-center rounded-full text-base font-bold sm:h-14 sm:w-14 sm:text-lg " +
							(day.score !== null
								? "bg-[#18867d] text-white"
								: day.isToday
									? "border-2 border-dashed border-[#1FA89C] text-[#1FA89C]"
									: "border border-[#D7ECED] bg-white text-[#B9CFD0]")
						}
					>
						{day.score !== null ? (
							<svg
								aria-hidden="true"
								className="h-6 w-6 sm:h-7 sm:w-7"
								fill="none"
								stroke="currentColor"
								strokeWidth={3}
								viewBox="0 0 24 24"
							>
								<path
									d="M5 13l4 4L19 7"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						) : (
							"–"
						)}
					</span>
				</div>
			))}
		</div>
	);
}

function PlanElement({
	text,
	isFinished,
}: {
	text: string;
	isFinished: boolean;
}) {
	const className = isFinished ? "line-through text-gray-400" : "";

	return <span className={className}>{text}</span>;
}

export function PatientHomeClient() {
	const router = useRouter();
	const [homeData, setHomeData] = useState<PatientHomeData | null>(null);
	const [homeAction, setHomeAction] = useState({
		eyebrow: "",
		title: "",
		description: "",
		progressPercent: undefined as number | undefined,
		buttonText: "",
	});
	const [errorMessage, setErrorMessage] = useState("");
	const [micError, setMicError] = useState(""); // <-- New state for microphone permission error
	const [isLoading, setIsLoading] = useState(true);
	const [isFinished, setIsFinished] = useState(false);
	const [showStartToast, setShowStartToast] = useState(false);
	const [isStartingAction, setIsStartingAction] = useState(false);
	const [assignedSetId, setAssignedSetId] = useState("");
	const [dailyPlanScheduleId, setDailyPlanScheduleId] = useState("");
	const [todayPlans, setTodayPlans] = useState<JSX.Element[] | undefined>();

	useEffect(() => {
		let isActive = true;

		async function loadHomeData() {
			const session = getAuthSession();

			if (!session || session.role !== "patient") {
				router.replace("/");
				return;
			}

			const result = await getPatientHomeData(session.user.id);

			if (!isActive) {
				return;
			}

			if (!result.success) {
				setErrorMessage(result.errorMessage);
				setIsLoading(false);
				return;
			}

			const patientId = session.user.patientId;
			setHomeData(result.data);

			switch (result.data.nextAction.type) {
				case "has_daily_training_plan": {
					const todayPlanResult = await getTodayTrainingPlan(Number(patientId));
					const todayPlanData = [...(todayPlanResult.data ?? [])].sort(
						(a, b) => {
							if (a.status === "PENDING" && b.status !== "PENDING") return -1;
							if (a.status !== "PENDING" && b.status === "PENDING") return 1;
							return 0;
						},
					);

					const planList: JSX.Element[] = [];

					let currentPlan;

					if (todayPlanData.length > 0) {
						for (let i: number = 0; i < todayPlanData.length; i++) {
							const planEntry = todayPlanData[i];
							const text = i + 1 + ". " + planEntry.moduleName;
							planList.push(
								<PlanElement
									text={text}
									isFinished={planEntry.status === "COMPLETED"}
									key={i}
								/>,
							);

							if (planEntry.status === "PENDING" && !currentPlan) {
								currentPlan = planEntry;
							}
						}
					}
					if (currentPlan) {
						setAssignedSetId(currentPlan.assignedSetId);
						setDailyPlanScheduleId(currentPlan.dailyPlanScheduleId);
					}

					setTodayPlans(planList);

					setHomeAction({
						eyebrow: "มาเริ่มฝึกกันเถอะ!",
						title: "กิจกรรมวันนี้",
						description: "",
						progressPercent: 0,
						buttonText: "เริ่มกันเลย!",
					});
					break;
				}
				case "needs_standard_assessment":
					setHomeAction({
						eyebrow: "แบบทดสอบก่อนใช้งาน",
						title: "ทำแบบทดสอบก่อนใช้งาน",
						description: "เริ่มต้นด้วยแบบทดสอบเพื่อให้ระบบวางแผนการฝึกที่เหมาะกับคุณ",
						progressPercent: 0,
						buttonText: "เริ่มทำแบบทดสอบ",
					});
					break;
				case "finished_daily_training_plan":
					setIsFinished(true);
					break;
			}

			setIsLoading(false);
		}

		loadHomeData();

		return () => {
			isActive = false;
		};
	}, [router]);

	function handleLogout() {
		clearAuthSession();
		router.push("/");
	}

	async function handlePrimaryActionClick(
		event: MouseEvent<HTMLAnchorElement>,
	) {
		event.preventDefault();

		if (!homeData || isStartingAction) {
			return;
		}

		// --- MICROPHONE PERMISSION CHECK ---
		setMicError("");
		try {
			// This will prompt the user if permission hasn't been granted yet
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			// Stop the tracks immediately to free up the hardware
			stream.getTracks().forEach((track) => track.stop());
		} catch (error) {
			console.error("Microphone permission denied:", error);
			setMicError(
				"ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้งานไมโครโฟนในเบราว์เซอร์เพื่อเริ่มต้น",
			);
			return; // Prevent navigating if permission is denied
		}
		// -----------------------------------

		const authSession = getAuthSession();
		if (!authSession || authSession.role !== "patient") {
			setErrorMessage("Session not found!");
			setIsLoading(false);
			return;
		}

		const patientId = Number(authSession.user.patientId);
		if (!Number.isInteger(patientId) || patientId <= 0) {
			setErrorMessage("ไม่พบข้อมูลผู้รับบริการ");
			setIsLoading(false);
			return;
		}

		if (assignedSetId) {
			if (typeof window !== "undefined") {
				window.sessionStorage.setItem(
					"dailyPlanScheduleId",
					dailyPlanScheduleId,
				);
			}

			setShowStartToast(true);
			setIsStartingAction(true);
			setIsLoading(true);

			const sessionResult = await createNamingSession(
				assignedSetId,
				patientId,
				dailyPlanScheduleId,
			);

			if (!sessionResult.success) {
				setErrorMessage(sessionResult.errorMessage);
				setIsStartingAction(false);
				setIsLoading(false);
				return;
			}

			const sessionId = sessionResult.data.sessionId;
			router.push(`/patient/training/naming/session/${sessionId}`);
			return;
		}

		setShowStartToast(true);
		setIsStartingAction(true);

		window.setTimeout(() => {
			router.push(homeData.nextAction.targetPath);
		}, 700);
	}

	return (
		<main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-5 py-6 text-[#123232] sm:px-8 sm:py-7">
			<div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-260 flex-col sm:min-h-[calc(100dvh-3.5rem)]">
				{/* UX Fix: Moved the logout button to the top right to match standard mental models */}
				<header className="flex justify-end">
					<button
						className="min-h-14 rounded-full border border-[#C8E9EA] bg-white px-7 text-lg font-semibold text-[#1A7F78] outline-none transition hover:bg-[#F5FEFF] focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98]"
						type="button"
						onClick={handleLogout}
					>
						ออกจากระบบ
					</button>
				</header>

				<section className="flex flex-1 items-center justify-center">
					{isLoading ? (
						<p className="text-center text-2xl font-bold text-[#45686A] sm:text-3xl">
							กำลังโหลดข้อมูล...
						</p>
					) : errorMessage || !homeData ? (
						<div className="mx-auto w-full max-w-230 rounded-[28px] border border-[#F3D0D0] bg-white px-7 py-8 text-center shadow-[0_18px_45px_rgba(24,112,108,0.08)] sm:px-9">
							<p className="text-2xl font-bold text-[#B42318] sm:text-3xl">
								{errorMessage || "ไม่พบข้อมูลผู้รับบริการ"}
							</p>
						</div>
					) : (
						<div className="mx-auto w-full max-w-230">
							<h1 className="mb-8 text-center text-3xl font-bold leading-tight sm:text-4xl text-[#123232]">
								สวัสดีค่ะ คุณ{homeData.patient.name}
							</h1>

							{isFinished ? (
								<article className="rounded-[34px] border border-[#C8E9EA] bg-white px-7 py-10 text-center shadow-[0_22px_55px_rgba(24,112,108,0.1)] sm:px-10 sm:py-12">
									<div className="mb-10 border-b border-[#E3F3F4] pb-8">
										<p className="mb-4 text-lg font-bold sm:text-3xl">
											ผลงานของท่าน 7 วันที่ผ่านมา
										</p>
										<WeekStreak days={homeData.weekStreak} />
									</div>

									<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#DDF2F3] sm:h-24 sm:w-24">
										<svg
											aria-hidden="true"
											className="h-10 w-10 text-[#1FA89C] sm:h-12 sm:w-12"
											fill="none"
											stroke="currentColor"
											strokeWidth={3}
											viewBox="0 0 24 24"
										>
											<path
												d="M5 13l4 4L19 7"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</div>

									<h2 className="mt-6 text-3xl font-bold leading-tight text-[#1A7F78] sm:text-4xl">
										วันนี้เก่งมากเลยค่ะ ทำครบหมดแล้ว!
									</h2>
									<p className="mt-4 text-xl font-medium leading-relaxed text-[#4E6D70] sm:text-2xl">
										พักผ่อนเยอะๆ นะคะ แล้วพรุ่งนี้เจอกันค่ะ
									</p>
								</article>
							) : (
								<article className="rounded-[34px] border border-[#C8E9EA] bg-white px-7 py-8 shadow-[0_22px_55px_rgba(24,112,108,0.1)] sm:px-10 sm:py-5">
									{homeAction.eyebrow ? (
										<p className="text-lg font-bold text-[#1FA89C] pb-3">
											{homeAction.eyebrow}
										</p>
									) : null}

									<h2 className="mt-2 text-3xl font-bold leading-tight">
										{homeAction.title}
									</h2>
									<p className="mt-3 text-xl font-medium leading-relaxed pl-3 whitespace-pre-wrap">
										{todayPlans?.flatMap((val, i) =>
											i === 0 ? [val] : [<br key={i + 0.5} />, val],
										)}
									</p>

									<div className="relative mt-10">
										{showStartToast ? (
											<p
												className="pointer-events-none absolute -top-16 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#123232] px-6 py-3 text-lg font-semibold text-white shadow-[0_14px_30px_rgba(18,50,50,0.16)]"
												role="status"
											>
												เริ่มกันเลย!
											</p>
										) : null}

										<Link
											className="flex min-h-18 w-full items-center justify-center rounded-3xl bg-[#1FA89C] px-7 py-5 text-center text-xl font-bold text-white shadow-[0_16px_34px_rgba(31,168,156,0.24)] outline-none transition duration-150 hover:bg-[#178F84] hover:shadow-[0_18px_38px_rgba(31,168,156,0.3)] focus:ring-4 focus:ring-[#1FA89C]/30 active:scale-[0.98] active:bg-[#13786F] sm:text-2xl"
											href={homeData.nextAction.targetPath}
											onClick={handlePrimaryActionClick}
											aria-disabled={isStartingAction}
										>
											{homeAction.buttonText}
										</Link>

										{/* Error rendering block for Microphone Permission */}
										{micError && (
											<p className="mt-4 text-center text-lg font-semibold text-[#B42318]">
												{micError}
											</p>
										)}
									</div>
									<div className="border-t border-[#E3F3F4] pt-4 mt-8">
										<p className="mb-4 text-3xl font-bold">
											ผลงานของท่าน 7 วันที่ผ่านมา
										</p>
										<WeekStreak days={homeData.weekStreak} />
									</div>
								</article>
							)}
						</div>
					)}
				</section>
			</div>
		</main>
	);
}