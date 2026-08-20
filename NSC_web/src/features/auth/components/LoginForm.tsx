"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useId, useState } from "react";
import { loginWithAccessCode } from "../services/authService";
import { saveAuthSession } from "../services/authSession";

function BrandMark() {
	return (
		<svg
			aria-hidden="true"
			className="h-12 w-12 shrink-0 text-[#118a82] sm:h-16 sm:w-16 md:h-23 md:w-23"
			viewBox="0 0 96 96"
			fill="none"
		>
			<path
				d="M50.5 15.5c-19.8 0-35.8 14.1-35.8 31.4 0 8.9 4.2 16.9 11 22.6l-3.5 12.1 14.1-6.8c4.4 1.8 9.2 2.8 14.2 2.8 19.8 0 35.8-14.1 35.8-31.4S70.3 15.5 50.5 15.5Z"
				stroke="currentColor"
				strokeLinejoin="round"
				strokeWidth="5"
			/>
			<path
				d="M49.9 57.4c-8.7-5.4-13-9.6-13-15.1 0-4 2.9-7.1 6.7-7.1 2.7 0 4.8 1.3 6.3 3.4 1.4-2.1 3.6-3.4 6.2-3.4 3.9 0 6.8 3.1 6.8 7.1 0 5.5-4.3 9.7-13 15.1Z"
				fill="currentColor"
			/>
			<path
				d="M78.5 16.5c3.4 2.5 5.5 6.1 5.9 10.4"
				stroke="#82d1cc"
				strokeLinecap="round"
				strokeWidth="3"
			/>
			<path
				d="M70.7 13c2.6 1.3 4.5 3.5 5.4 6.2"
				stroke="#82d1cc"
				strokeLinecap="round"
				strokeWidth="3"
			/>
		</svg>
	);
}

function LockIcon() {
	return (
		<svg
			aria-hidden="true"
			className="h-6 w-6 shrink-0 text-[#7a858f] sm:h-8 sm:w-8"
			viewBox="0 0 24 24"
			fill="none"
		>
			<rect
				width="14"
				height="10"
				x="5"
				y="10"
				rx="2"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<path
				d="M8 10V7a4 4 0 0 1 8 0v3"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="2"
			/>
		</svg>
	);
}

function InfoIcon() {
	return (
		<svg
			aria-hidden="true"
			className="h-6 w-6 shrink-0 text-[#118a82] sm:h-7 sm:w-7"
			viewBox="0 0 24 24"
			fill="none"
		>
			<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
			<path
				d="M12 10.7v5"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="2"
			/>
			<circle cx="12" cy="7.8" r="1.2" fill="currentColor" />
		</svg>
	);
}

function LoginIcon() {
	return (
		<svg
			aria-hidden="true"
			className="h-6 w-6 shrink-0 sm:h-8 sm:w-8"
			viewBox="0 0 24 24"
			fill="none"
		>
			<path
				d="M14 5h2.8c1.2 0 2.2 1 2.2 2.2v9.6c0 1.2-1 2.2-2.2 2.2H14"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="2"
			/>
			<path
				d="M4 12h10.5m0 0-3.8-3.8m3.8 3.8-3.8 3.8"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
		</svg>
	);
}

function ShieldIcon() {
	return (
		<svg
			aria-hidden="true"
			className="h-6 w-6 shrink-0 sm:h-8 sm:w-8"
			viewBox="0 0 28 28"
			fill="none"
		>
			<path
				d="M14 3.3 22.4 6v7.2c0 5.2-3.4 9.6-8.4 11.6-5-2-8.4-6.4-8.4-11.6V6L14 3.3Z"
				fill="#9eddd8"
			/>
			<path
				d="m10.6 13.6 2.1 2.1 4.8-5"
				stroke="#fff"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2.2"
			/>
		</svg>
	);
}

function LeafAccent({ side }: { side: "left" | "right" }) {
	const sideClass =
		side === "left"
			? "left-0 origin-bottom-left"
			: "right-0 origin-bottom-right";

	return (
		<div
			aria-hidden="true"
			className={`pointer-events-none absolute bottom-12 hidden h-64 w-28 opacity-45 md:block ${sideClass}`}
		>
			<span className="absolute bottom-0 left-1/2 h-56 w-2 -translate-x-1/2 rounded-full bg-[#83d8d1]" />
			<span className="absolute bottom-34 left-2 h-16 w-9 rounded-[100%_0_100%_0] bg-[#83d8d1]" />
			<span className="absolute bottom-42 left-14 h-16 w-9 rounded-[0_100%_0_100%] bg-[#83d8d1]" />
			<span className="absolute bottom-18 left-6 h-16 w-9 rounded-[100%_0_100%_0] bg-[#83d8d1]" />
			<span className="absolute bottom-25 left-16 h-16 w-9 rounded-[0_100%_0_100%] bg-[#83d8d1]" />
		</div>
	);
}

export function LoginForm() {
	const router = useRouter();
	const inputId = useId();
	const errorId = useId();
	const [accessCode, setAccessCode] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const submitButtonLabel = accessCode.trim().toUpperCase().startsWith("P-")
		? "เข้าเริ่มฝึก"
		: "เข้าใช้งาน";

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage("");

		const formData = new FormData(event.currentTarget);
		const submittedAccessCode = String(
			formData.get("accessCode") ?? accessCode,
		);
		const result = await loginWithAccessCode(submittedAccessCode);

		if (!result.success) {
			setErrorMessage(result.errorMessage);
			return;
		}

		saveAuthSession(result.user);
		router.push(result.redirectPath);
	}

	return (
		<section className="relative flex min-h-dvh flex-col overflow-hidden bg-[#ddf6f6] px-4 py-2 text-[#173d3f] sm:px-6 sm:py-6 lg:px-10">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.92)_0_16%,transparent_42%),linear-gradient(180deg,#e9fbfb_0%,#dff6f6_54%,#cfefec_100%)]" />
			<div className="pointer-events-none absolute -left-28 -bottom-30 h-80 w-130 rounded-[50%] bg-[#b7e7e3]/80" />
			<div className="pointer-events-none absolute -right-36 -bottom-35 h-96 w-125 rounded-[50%] bg-[#bdebe7]/80" />
			<div className="pointer-events-none absolute left-8 top-[10%] hidden h-5 w-28 rounded-full bg-white/75 shadow-[-24px_12px_0_-3px_rgba(255,255,255,0.86),38px_-8px_0_7px_rgba(255,255,255,0.82)] sm:block" />
			<div className="pointer-events-none absolute right-7 top-[8%] hidden h-9 w-32 rounded-full bg-white/75 shadow-[-25px_10px_0_-5px_rgba(255,255,255,0.9),22px_-16px_0_6px_rgba(255,255,255,0.88)] sm:block" />
			<LeafAccent side="left" />
			<LeafAccent side="right" />

			<main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center">
				<div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-[0_24px_70px_rgba(25,104,105,0.18)] lg:h-[min(45rem,calc(100dvh-6rem))] lg:grid-cols-[1.04fr_1fr]">
					<div className="relative flex flex-col overflow-hidden bg-[linear-gradient(135deg,#fbffff_0%,#effbfa_42%,#dff5f1_100%)] px-6 pb-2 pt-4 text-center sm:px-10 sm:pb-0 sm:pt-10 lg:min-h-0 lg:px-14 lg:pt-14">
						<div className="pointer-events-none absolute left-[14%] top-[47%] hidden h-5 w-5 rounded-full bg-[#bdeee8] lg:block" />
						<div className="pointer-events-none absolute right-[19%] top-[43%] hidden h-5 w-5 rounded-full bg-[#bdeee8] lg:block" />
						<div className="relative z-10">
							<div className="flex items-center justify-center gap-3 sm:gap-4">
								<BrandMark />
								<h1 className="text-4xl font-extrabold leading-none tracking-normal text-[#118a82] sm:text-6xl lg:text-[4rem]">
									พูดเพลิน
								</h1>
							</div>
							<p className="mt-3 text-lg font-medium leading-7 text-[#43505c] sm:mt-5 sm:text-[1.65rem] sm:leading-8">
								ฝึกพูดและสื่อสารได้ทุกที่ ทุกเวลา
							</p>
							<p className="mt-1 text-base font-bold leading-6 text-[#118a82] sm:text-[1.28rem] sm:leading-7">
								สำหรับผู้ป่วยหลังโรคหลอดเลือดสมอง
							</p>
						</div>

						<div className="relative z-10 mt-4 hidden flex-1 items-end justify-center pt-6 lg:mt-auto lg:flex">
							<Image
								src="/images/branding/login-caregiver-patient.png"
								alt="ผู้ป่วยสูงอายุกำลังฝึกพูดกับนักแก้ไขการพูด"
								width={610}
								height={500}
								priority
								className="h-auto max-h-105 w-full max-w-155 object-contain lg:max-h-117.5"
							/>
						</div>

						<div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden h-24 bg-[#d9f5ef] lg:block" />
						<div className="pointer-events-none absolute -bottom-10 left-[-10%] z-20 hidden h-36 w-[120%] rounded-[50%] bg-[#f8fffb] lg:block" />
						<div className="pointer-events-none absolute inset-y-0 right-0 hidden w-px bg-[#d9eaea] lg:block" />
					</div>

					<div className="flex items-center justify-center bg-white px-6 py-6 sm:px-10 sm:py-12 lg:min-h-0 lg:px-16">
						<div className="w-full max-w-107.5">
							<div className="text-center">
								<h2 className="text-2xl font-extrabold leading-tight tracking-normal text-[#118a82] sm:text-3xl lg:text-[2.35rem]">
									{submitButtonLabel}
								</h2>
								<p className="mt-2 text-base font-medium leading-6 text-[#4f5865] sm:mt-3 sm:text-[1.15rem] sm:leading-7">
									กรอกรหัสเข้าใช้งานตามบทบาทของคุณ
								</p>
							</div>

							<form
								className="mt-4 sm:mt-10 lg:mt-14"
								onSubmit={handleSubmit}
								noValidate
							>
								<label
									className="mb-2 block text-base font-bold leading-6 text-[#118a82] sm:mb-3 sm:text-[1.08rem]"
									htmlFor={inputId}
								>
									รหัสเข้าใช้งานผู้รับบริการ / Therapist Code
								</label>

								<div className="flex h-14 items-center gap-3 rounded-xl border border-[#c8d5dc] bg-white px-4 shadow-[0_8px_20px_rgba(39,92,98,0.06)] transition focus-within:border-[#118a82] focus-within:ring-4 focus-within:ring-[#118a82]/15 sm:h-16 sm:gap-4 sm:px-6 lg:h-20">
									<LockIcon />
									<input
										id={inputId}
										className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold uppercase tracking-normal text-[#173d3f] outline-none placeholder:text-[#8d949d] sm:text-[1.2rem]"
										type="text"
										name="accessCode"
										inputMode="text"
										autoCapitalize="characters"
										autoComplete="off"
										placeholder="เช่น P-482913 หรือ TH001"
										value={accessCode}
										onChange={(event) => {
											setAccessCode(event.target.value);
											if (errorMessage) {
												setErrorMessage("");
											}
										}}
										aria-invalid={Boolean(errorMessage)}
										aria-describedby={errorMessage ? errorId : undefined}
									/>
								</div>

								{errorMessage ? (
									<p
										id={errorId}
										className="mt-3 rounded-xl border border-[#ffd5d5] bg-[#fff7f7] px-4 py-3 text-[1.0rem] font-semibold leading-6 text-[#b42318]"
										role="alert"
									>
										{errorMessage}
									</p>
								) : null}

								<div className="mt-4 rounded-xl border border-[#b7e0df] bg-[linear-gradient(135deg,#f5ffff_0%,#eefbfa_100%)] px-4 py-3 text-[#37424d] shadow-[0_10px_22px_rgba(39,92,98,0.04)] sm:mt-7 sm:px-6 sm:py-5">
									<div className="flex items-start gap-3 sm:gap-4">
										<InfoIcon />
										<div>
											<p className="text-base font-bold text-[#118a82] sm:text-[1.08rem]">
												ตัวอย่างรหัสเข้าใช้งาน
											</p>
											<ul className="mt-1 list-disc space-y-1 pl-6 text-sm font-medium leading-6 sm:mt-2 sm:text-[1.05rem] sm:leading-7">
												<li>ผู้รับบริการ: เช่น P-715069, P-516550</li>
												<li>นักแก้ไขการพูด: เช่น TH001</li>
											</ul>
										</div>
									</div>
								</div>

								<button className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[linear-gradient(180deg,#139f94_0%,#0d847b_100%)] px-6 text-lg font-bold text-white shadow-[0_16px_30px_rgba(17,138,130,0.28)] outline-none transition hover:shadow-[0_20px_38px_rgba(17,138,130,0.32)] focus:ring-4 focus:ring-[#118a82]/25 disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none sm:mt-8 sm:h-16 sm:gap-4 sm:text-[1.45rem] lg:mt-9 lg:h-20">
									<LoginIcon />
									เข้าสู่ระบบ
								</button>
							</form>

							<div className="mt-5 flex items-center justify-center gap-3 text-center text-[0.9rem] font-medium leading-6 text-[#7b848d] sm:mt-10 sm:text-[0.98rem] lg:mt-16">
								<ShieldIcon />
								<span>ข้อมูลของคุณจะถูกเก็บรักษาเป็นความลับ</span>
							</div>
						</div>
					</div>
				</div>

				<p className="mt-3 text-center text-[0.9rem] font-medium leading-5 text-[#4e6269] sm:mt-6 sm:text-[0.95rem]">
					PoodPlearn © 2026&nbsp;&nbsp;|&nbsp;&nbsp;NSC 2026
				</p>
			</main>
		</section>
	);
}
