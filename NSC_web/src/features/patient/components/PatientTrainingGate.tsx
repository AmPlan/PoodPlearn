"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession } from "@/features/auth/services/authSession";
import { getPatientHomeData } from "../services/patientHomeService";

export function PatientTrainingGate({ children }: { children: ReactNode }) {
	const router = useRouter();
	const [allowed, setAllowed] = useState(false);
	const [error, setError] = useState("");
	const [attempt, setAttempt] = useState(0);
	useEffect(() => {
		let active = true;
		async function check() {
			const auth = getAuthSession();
			if (!auth || auth.role !== "patient") {
				router.replace("/");
				return;
			}
			try {
				const result = await getPatientHomeData(auth.user.id);
				if (!active) return;
				if (!result.success) throw new Error(result.errorMessage);
				if (result.data.nextAction.type === "needs_standard_assessment") {
					router.replace("/patient/assessment/session");
					return;
				}
				if (
					!["has_daily_training_plan", "finished_daily_training_plan"].includes(
						result.data.nextAction.type,
					)
				)
					throw new Error("unknown state");
				setAllowed(true);
			} catch {
				if (active) setError("ยังโหลดข้อมูลไม่ได้ กรุณาลองอีกครั้ง");
			}
		}
		void check();
		return () => {
			active = false;
		};
	}, [router, attempt]);
	if (allowed) return children;
	return (
		<main className="flex min-h-dvh items-center justify-center bg-[#edf9f6] p-6 text-center text-xl text-[#173d3f]">
			<div>
				<p role={error ? "alert" : "status"}>{error || "กำลังโหลด…"}</p>
				{error && (
					<button
						className="mt-5 min-h-16 rounded-2xl bg-[#118a82] px-8 py-4 font-bold text-white"
						onClick={() => {
							setError("");
							setAttempt((value) => value + 1);
						}}
					>
						ลองอีกครั้ง
					</button>
				)}
			</div>
		</main>
	);
}
