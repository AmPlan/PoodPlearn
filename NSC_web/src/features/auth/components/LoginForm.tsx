"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	ArrowRight,
	Heart,
	LoaderCircle,
	LockKeyhole,
	MessageCircleHeart,
	Stethoscope,
} from "lucide-react";
import { saveAuthSession } from "../services/authSession";
import {
	loginPatient,
	PATIENT_CODE_PATTERN,
	startTherapistGoogleLogin,
} from "../services/loginPageService";

export function LoginForm() {
	const router = useRouter();
	const codeId = useId();
	const codeInput = useRef<HTMLInputElement>(null);
	const patientPending = useRef(false);
	const googlePending = useRef(false);
	const [code, setCode] = useState("");
	const [patientError, setPatientError] = useState("");
	const [googleError, setGoogleError] = useState("");
	const [patientLoading, setPatientLoading] = useState(false);
	const [googleLoading, setGoogleLoading] = useState(false);

	async function handlePatientLogin(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (patientPending.current) return;
		const normalized = code.trim().toUpperCase();
		if (!normalized || !PATIENT_CODE_PATTERN.test(normalized)) {
			setPatientError(
				!normalized
					? "กรุณากรอกรหัสคนไข้"
					: "กรอกรหัส PN ตามด้วยตัวเลขอย่างน้อย 3 หลัก เช่น PN001",
			);
			codeInput.current?.focus();
			return;
		}
		patientPending.current = true;
		setPatientLoading(true);
		setPatientError("");
		try {
			const result = await loginPatient(normalized);
			if (!result.success) {
				setPatientError(result.errorMessage);
				return;
			}
			saveAuthSession(result.user);
			router.push(result.redirectPath);
		} catch {
			setPatientError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
		} finally {
			patientPending.current = false;
			setPatientLoading(false);
		}
	}

	async function handleGoogleLogin() {
		if (googlePending.current) return;
		googlePending.current = true;
		setGoogleLoading(true);
		setGoogleError("");
		try {
			const authorizationUrl = await startTherapistGoogleLogin();
			window.location.assign(authorizationUrl);
		} catch (error) {
			setGoogleError(
				(error instanceof Error && error.message.startsWith("ระบบ")) ||
					(error instanceof Error && error.message.startsWith("เข้าสู่ระบบ"))
					? error.message
					: "เชื่อมต่อ Google ไม่ได้ กรุณาลองอีกครั้งในภายหลัง",
			);
			googlePending.current = false;
			setGoogleLoading(false);
		}
	}

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center bg-[#edf9f6] px-4 py-7 text-[#173d3f] sm:px-8">
			<header className="mb-7 flex items-center justify-center gap-3 text-[#118a82]">
				<MessageCircleHeart
					aria-hidden="true"
					className="h-14 w-14 sm:h-16 sm:w-16"
				/>
				<h1 className="text-4xl font-extrabold sm:text-5xl">พูดเพลิน</h1>
			</header>
			<div className="grid w-full max-w-4xl gap-5 md:grid-cols-2">
				<section
					aria-labelledby="patient-title"
					className="rounded-3xl border border-[#b9ded8] bg-white p-6 shadow-sm sm:p-9"
				>
					<Heart
						aria-hidden="true"
						className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-[#e2f6ef] p-4 text-[#118a82]"
					/>
					<h2 id="patient-title" className="text-center text-3xl font-bold">
						คนไข้
					</h2>
					<form
						onSubmit={handlePatientLogin}
						noValidate
						aria-busy={patientLoading}
						className="mt-7"
					>
						<label
							htmlFor={codeId}
							className="mb-3 block text-xl font-semibold"
						>
							รหัส PN
						</label>
						<div
							className={`flex h-18 items-center gap-3 rounded-2xl border-2 bg-[#fcfefd] px-4 focus-within:ring-4 focus-within:ring-[#118a82]/20 ${patientError ? "border-red-400" : "border-[#b6d9d2] focus-within:border-[#118a82]"}`}
						>
							<LockKeyhole
								aria-hidden="true"
								className="h-7 w-7 shrink-0 text-[#6a8c86]"
							/>
							<input
								ref={codeInput}
								id={codeId}
								name="patientCode"
								value={code}
								onChange={(event) => {
									setCode(event.target.value.toUpperCase());
									setPatientError("");
								}}
								disabled={patientLoading}
								type="text"
								autoComplete="username"
								autoCapitalize="characters"
								spellCheck={false}
								placeholder="PN001"
								aria-invalid={Boolean(patientError)}
								aria-describedby={`${codeId}-hint${patientError ? ` ${codeId}-error` : ""}`}
								className="h-full w-full min-w-0 bg-transparent text-3xl font-bold tracking-wider outline-none placeholder:text-[#91a5a0] disabled:opacity-60"
							/>
						</div>
						<p id={`${codeId}-hint`} className="mt-3 text-base text-[#526a66]">
							รหัสจากนักแก้ไขการพูด
						</p>
						<div aria-live="polite" aria-atomic="true">
							{patientError && (
								<p
									id={`${codeId}-error`}
									role="alert"
									className="mt-4 rounded-xl bg-red-50 p-4 text-lg text-red-800"
								>
									{patientError}
								</p>
							)}
						</div>
						<button
							type="submit"
							disabled={patientLoading}
							className="mt-6 flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl bg-[#118a82] px-5 text-2xl font-bold text-white transition hover:bg-[#0c706a] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#118a82] disabled:opacity-60"
						>
							{patientLoading ? (
								<LoaderCircle
									aria-hidden="true"
									className="h-9 w-9 animate-spin"
								/>
							) : (
								<ArrowRight aria-hidden="true" className="h-9 w-9" />
							)}
							{patientLoading ? "กำลังเข้า…" : "เริ่มฝึก"}
						</button>
					</form>
				</section>
				<section
					aria-labelledby="therapist-title"
					className="flex flex-col rounded-3xl border border-[#b9ded8] bg-[#f4fcfa] p-6 shadow-sm sm:p-9"
				>
					<Stethoscope
						aria-hidden="true"
						className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-[#dcefeb] p-4 text-[#118a82]"
					/>
					<h2 id="therapist-title" className="text-center text-3xl font-bold">
						นักแก้ไขการพูด
					</h2>
					<div
						className="flex flex-1 flex-col justify-center pt-7"
						aria-busy={googleLoading}
					>
						<button
							type="button"
							aria-label="เข้าสู่ระบบด้วย Google"
							onClick={handleGoogleLogin}
							disabled={googleLoading}
							className="flex min-h-20 w-full items-center justify-center gap-4 rounded-2xl border-2 border-[#9fc8bf] bg-white px-5 text-2xl font-bold transition hover:border-[#118a82] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#118a82] disabled:opacity-60"
						>
							{googleLoading ? (
								<LoaderCircle
									aria-hidden="true"
									className="h-9 w-9 animate-spin"
								/>
							) : (
								<span
									aria-hidden="true"
									className="text-3xl font-bold text-blue-600"
								>
									G
								</span>
							)}
							{googleLoading ? "กำลังเข้า…" : "Google"}
						</button>
						<p className="mt-3 text-center text-base text-[#526a66]">
							Gmail เท่านั้น
						</p>
						<div aria-live="polite" aria-atomic="true">
							{googleError && (
								<p
									role="alert"
									className="mt-4 rounded-xl bg-red-50 p-4 text-lg text-red-800"
								>
									{googleError}
								</p>
							)}
						</div>
					</div>
				</section>
			</div>
			{process.env.NODE_ENV === "development" && (
				<Link
					href="/dev/preview"
					className="mt-6 inline-flex min-h-14 items-center justify-center rounded-xl border border-[#118a82] bg-white px-5 text-lg font-semibold text-[#118a82]"
				>
					ดูตัวอย่าง (ไม่ใช้รหัส)
				</Link>
			)}
		</main>
	);
}
