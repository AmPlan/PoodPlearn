"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	Image as Picture,
	Lightbulb,
	LoaderCircle,
	Mic,
	Play,
	RotateCcw,
	Send,
	SkipForward,
	Square,
	Volume2,
} from "lucide-react";
import { getAuthSession } from "@/features/auth/services/authSession";
import {
	findCatalogSet,
	isSetReady,
	NAMING_PROMPT_AUDIO,
} from "../data/namingCatalog";
import { useNamingMedia } from "../hooks/useNamingMedia";
import { patientAudioManifest } from "../data/patientAudioManifest";
import {
	loadAssignedNamingSet,
	sendNamingResponse,
	summarizeRound,
	type NamingRunSet,
	type RoundResponse,
} from "../services/namingFrontendService";
import {
	completeNamingSession,
	createNamingSession,
	getNamingSessionById,
} from "../services/pn002NamingService";
import { namingButton, namingPage, namingSecondary } from "./NamingLibrary";
import { TrainingImageFrame } from "./TrainingImageFrame";

type Props = {
	homeHref?: string;
	setId?: string;
	sessionId?: string;
	assignedSetId?: string;
	dailyPlanScheduleId?: string;
};
export function NamingTrainingSessionClient({
	homeHref = "/patient/home",
	setId,
	sessionId,
	assignedSetId,
	dailyPlanScheduleId,
}: Props) {
	const [data, setData] = useState<NamingRunSet>();
	const [activeSession, setActiveSession] = useState(sessionId);
	const [schedule, setSchedule] = useState(dailyPlanScheduleId);
	const [notice, setNotice] = useState("");
	const [loaded, setLoaded] = useState(false);
	const [started, setStarted] = useState(false);
	const [starting, setStarting] = useState(false);
	const [round, setRound] = useState(0);
	const startLock = useRef(false);
	useEffect(() => {
		let active = true;
		async function load() {
			try {
				let backendId = assignedSetId;
				if (sessionId) {
					const session = await getNamingSessionById(sessionId);
					if (!session.success) throw new Error(session.errorMessage);
					backendId = session.data.setId;
				}
				const result = backendId
					? await loadAssignedNamingSet(backendId)
					: findCatalogSet(setId ?? "");
				if (!result) throw new Error("ไม่พบชุดฝึก กรุณากลับไปเลือกใหม่");
				if (active) {
					setData(result);
					setLoaded(true);
				}
			} catch (error) {
				if (active) {
					setNotice(error instanceof Error ? error.message : "โหลดชุดฝึกไม่ได้");
					setLoaded(true);
				}
			}
		}
		void load();
		return () => {
			active = false;
		};
	}, [setId, sessionId, assignedSetId]);

	async function start() {
		if (startLock.current || !data || !isSetReady(data)) return;
		startLock.current = true;
		setStarting(true);
		setNotice("");
		try {
			if (data.backendSetId && !activeSession) {
				const auth = getAuthSession();
				if (!auth?.user.patientId || auth.role !== "patient")
					throw new Error("กรุณาเข้าสู่ระบบคนไข้");
				const result = await createNamingSession(
					data.backendSetId,
					auth.user.patientId,
					schedule,
				);
				if (!result.success) throw new Error(result.errorMessage);
				setActiveSession(result.data.sessionId);
			}
			setStarted(true);
		} catch {
			setNotice("เริ่มฝึกไม่ได้ กรุณาลองอีกครั้ง");
		} finally {
			setStarting(false);
			startLock.current = false;
		}
	}
	if (started && data)
		return (
			<NamingRound
				key={round}
				homeHref={homeHref}
				set={data}
				sessionId={activeSession}
				schedule={schedule}
				onRepeat={() => {
					setStarted(false);
					setActiveSession(undefined);
					setSchedule(undefined);
					setRound((value) => value + 1);
				}}
			/>
		);
	return (
		<main className={namingPage}>
			<div className="mx-auto max-w-2xl">
				<Link className={namingSecondary} href={homeHref}>
					<ArrowLeft aria-hidden="true" className="mr-2 h-7 w-7" />
					กลับ
				</Link>
				<section className="mt-5 rounded-3xl bg-white p-6 text-center shadow-sm sm:p-10">
					{!loaded ? (
						<p role="status" className="text-xl">
							กำลังโหลด…
						</p>
					) : (
						data && (
							<>
								<Picture
									aria-hidden="true"
									className="mx-auto h-20 w-20 text-[#118a82]"
								/>
								<h1 className="mt-4 text-3xl font-bold">เรียกชื่อภาพ</h1>
								<p className="mt-3 text-xl">
									{data.category} · ชุด {data.number} · {data.questions.length}{" "}
									ข้อ
								</p>
								<div
									className="mx-auto my-7 flex max-w-sm items-center justify-center gap-5 text-[#118a82]"
									aria-hidden="true"
								>
									<Picture className="h-12 w-12" />
									<ArrowRight className="h-7 w-7" />
									<Mic className="h-16 w-16" />
								</div>
								<p className="text-2xl font-semibold">ดูภาพ แล้วพูดชื่อ</p>
								{!isSetReady(data) && (
									<p role="status" className="mt-4 text-xl text-amber-800">
										รอรูปภาพเพิ่มเติม
									</p>
								)}
								<button
									type="button"
									onClick={start}
									disabled={!isSetReady(data) || starting}
									className={`${namingButton} mt-7 min-h-20 w-full gap-3 text-2xl`}
								>
									{starting ? (
										<LoaderCircle
											aria-hidden="true"
											className="h-8 w-8 animate-spin"
										/>
									) : (
										<Play aria-hidden="true" className="h-8 w-8" />
									)}
									{starting ? "กำลังเริ่ม…" : "เริ่มฝึก"}
								</button>
								<details className="mt-6 text-left text-base leading-7 text-[#526a66]">
									<summary className="cursor-pointer py-3">
										ข้อมูลสำหรับผู้ดูแล
									</summary>
									<p>
										{data.backendSetId
											? "ชุดฝึกจากระบบ ส่งเสียงให้ตรวจเมื่อกดส่งเสียง ข้อที่ข้ามหรือไม่ส่งจะยังไม่บันทึกในแผน"
											: "ฝึกเพิ่มเติมจากคลัง ไม่ใช่ชุดที่เลือกจากผลประเมิน ไม่ส่งเสียงหรือบันทึกลงแผน ข้อมูลรอบนี้หายเมื่อออกจากหน้าหรือรีเฟรช"}
									</p>
								</details>
							</>
						)
					)}
					{notice && (
						<p
							role="alert"
							className="mt-5 rounded-xl bg-red-50 p-4 text-lg text-red-800"
						>
							{notice}
						</p>
					)}
				</section>
			</div>
		</main>
	);
}

export function NamingRound({
	homeHref = "/patient/home",
	set,
	sessionId,
	schedule,
	onRepeat,
}: {
	homeHref?: string;
	set: NamingRunSet;
	sessionId?: string;
	schedule?: string;
	onRepeat: () => void;
}) {
	const [index, setIndex] = useState(0);
	const [hints, setHints] = useState(0);
	const [revealed, setRevealed] = useState(false);
	const [responses, setResponses] = useState<RoundResponse[]>([]);
	const [submitted, setSubmitted] = useState(false);
	const [correct, setCorrect] = useState<boolean>();
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const [finished, setFinished] = useState(false);
	const [completion, setCompletion] = useState<
		"idle" | "saving" | "saved" | "failed"
	>("idle");
	const [imageFailed, setImageFailed] = useState(false);
	const actionLock = useRef(false);
	const lastSaved = useRef<{ correct?: boolean } | undefined>(undefined);
	const lastAction = useRef(0);
	const startedAt = useRef(0);
	const heading = useRef<HTMLHeadingElement>(null);
	const media = useNamingMedia(setError);
	const question = set.questions[index];
	const answerAudio = patientAudioManifest.namingAnswers[question.id];
	const recording =
		media.micState === "requesting" || media.micState === "recording";
	const stats = summarizeRound(responses);
	useEffect(() => {
		startedAt.current = Date.now();
		heading.current?.focus();
	}, [index, finished]);
	function lock() {
		if (actionLock.current || Date.now() - lastAction.current < 600)
			return false;
		actionLock.current = true;
		lastAction.current = Date.now();
		return true;
	}
	function hint() {
		if (recording || hints >= 2 || revealed || !lock()) return;
		media.stopAudio();
		setHints((value) => value + 1);
		const audio =
			patientAudioManifest.namingHints[`${question.id}-${hints + 1}`];
		if (audio) void media.play(audio);
		actionLock.current = false;
	}
	async function submit() {
		if (
			!sessionId ||
			!set.backendSetId ||
			!set.questionIds ||
			submitted ||
			recording ||
			!media.blob ||
			!lock()
		)
			return;
		setBusy(true);
		setError("");
		media.stopAudio();
		try {
			const result = await sendNamingResponse({
				sessionId,
				setId: set.backendSetId,
				questionId: set.questionIds[index],
				hintsUsed: revealed ? 3 : hints,
				responseTimeMs: Date.now() - startedAt.current,
				voiceFile: media.blob,
			});
			setSubmitted(true);
			setCorrect(result.correct);
			lastSaved.current = result;
		} catch {
			setError("ส่งเสียงไม่ได้ แตะส่งเสียงเพื่อลองใหม่");
		} finally {
			setBusy(false);
			actionLock.current = false;
		}
	}
	function next(skipped: boolean) {
		if (busy || recording || (imageFailed && !skipped) || !lock()) return;
		if (
			!skipped &&
			!revealed &&
			!submitted &&
			(!media.blob || Boolean(sessionId))
		) {
			actionLock.current = false;
			return;
		}
		const response: RoundResponse = {
			questionId: question.id,
			skipped,
			hintsUsed: revealed ? 3 : hints,
			revealed,
			recorded: Boolean(media.blob),
			submitted: Boolean(lastSaved.current),
			correct: lastSaved.current?.correct,
		};
		setResponses((previous) => [...previous, response]);
		media.reset();
		setHints(0);
		setRevealed(false);
		setSubmitted(false);
		setCorrect(undefined);
		setError("");
		setImageFailed(false);
		lastSaved.current = undefined;
		if (index === set.questions.length - 1) setFinished(true);
		else setIndex((value) => value + 1);
		actionLock.current = false;
	}
	async function finishOnServer() {
		if (!sessionId || stats.submitted !== set.questions.length || !lock())
			return;
		setCompletion("saving");
		setError("");
		try {
			const result = await completeNamingSession(sessionId, schedule);
			if (!result.success) throw new Error(result.errorMessage);
			setCompletion("saved");
		} catch {
			setCompletion("failed");
			setError("ยังบันทึกไม่ได้ กรุณาลองอีกครั้ง");
		} finally {
			actionLock.current = false;
		}
	}
	if (finished)
		return (
			<main className={namingPage}>
				<section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 text-center sm:p-10">
					<Check
						aria-hidden="true"
						className="mx-auto h-24 w-24 rounded-full bg-[#e0f5eb] p-4 text-[#118a82]"
					/>
					<h1
						ref={heading}
						tabIndex={-1}
						className="mt-5 text-3xl font-bold outline-none"
					>
						ฝึกจบแล้ว
					</h1>
					<p className="mt-3 text-xl">
						{stats.completed} / {set.questions.length} ข้อ
					</p>
					<div className="my-6 grid grid-cols-2 gap-4">
						<p className="rounded-2xl bg-[#edf9f6] p-5 text-xl">
							ตอบแล้ว
							<br />
							<strong className="text-3xl">{stats.answered}</strong>
						</p>
						<p className="rounded-2xl bg-[#edf9f6] p-5 text-xl">
							ข้าม
							<br />
							<strong className="text-3xl">{stats.skipped}</strong>
						</p>
					</div>
					<p className="text-lg text-[#526a66]">
						{stats.evaluated
							? `ผลตรวจ ${stats.evaluated} ข้อ · ถูก ${stats.correct} ข้อ`
							: "ยังไม่มีผลตรวจการพูด"}
					</p>
					{sessionId && stats.submitted === set.questions.length && (
						<button
							disabled={completion === "saving" || completion === "saved"}
							onClick={finishOnServer}
							className={`${namingButton} mt-5 w-full gap-3`}
						>
							<Check aria-hidden="true" />
							{completion === "saved"
								? "บันทึกแล้ว"
								: completion === "saving"
									? "กำลังบันทึก…"
									: "บันทึกจบรอบ"}
						</button>
					)}
					{error && (
						<p role="alert" className="mt-4 text-lg text-red-800">
							{error}
						</p>
					)}
					<div className="mt-6 grid gap-4 sm:grid-cols-2">
						<button onClick={onRepeat} className={`${namingSecondary} gap-3`}>
							<RotateCcw aria-hidden="true" />
							ฝึกซ้ำ
						</button>
						<Link href={homeHref} className={`${namingButton} gap-3`}>
							<ArrowRight aria-hidden="true" />
							กลับหน้าหลัก
						</Link>
					</div>
					<details className="mt-6 text-left text-base leading-7 text-[#526a66]">
						<summary className="cursor-pointer py-3">ผลรอบนี้สำหรับผู้ดูแล</summary>
						<p>
							{set.category} · ชุด {set.number} · ใช้คำใบ้ {stats.hinted} ข้อ ·
							ดูเฉลย {stats.revealed} ข้อ
						</p>
						<p>
							{sessionId
								? `ส่งคำตอบสำเร็จ ${stats.submitted}/${set.questions.length} ข้อ${stats.submitted < set.questions.length ? " · ยังไม่ยืนยันการจบแผนในระบบ" : ""}`
								: "รอบนี้ไม่ได้บันทึกลงแผนฝึก"}
						</p>
						<ol className="mt-3 space-y-2">
							{responses.map((response, i) => (
								<li key={response.questionId}>
									{i + 1}. {set.questions[i].answer} —{" "}
									{response.skipped
										? "ข้าม"
										: response.recorded
											? "ตอบแล้ว"
											: "ดูเฉลย"}
									{response.correct === true
										? " · ระบบตรวจว่าถูก"
										: response.correct === false
											? " · ระบบตรวจว่ายังไม่ถูก"
											: " · ยังไม่มีผลตรวจ"}
								</li>
							))}
						</ol>
					</details>
				</section>
			</main>
		);
	const readyToSend = Boolean(sessionId && media.blob && !submitted);
	const micLabel = busy
		? "กำลังส่ง…"
		: media.micState === "requesting"
			? "รอไมโครโฟน…"
			: media.micState === "recording"
				? "หยุด"
				: submitted
					? "ส่งแล้ว"
					: readyToSend
						? "ส่งเสียง"
						: media.blob
							? "พูดอีกครั้ง"
							: "แตะเพื่อพูด";
	return (
		<main className="min-h-dvh bg-[#edf9f6] p-3 text-[#173d3f] sm:p-6">
			<section className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-4xl flex-col rounded-3xl bg-white px-4 py-4 shadow-sm sm:px-8 sm:py-6">
				<header className="flex items-center justify-between gap-3">
					<Link
						href={homeHref}
						aria-label="ออกจากแบบฝึกกลับหน้าหลัก"
						className={`${namingSecondary} gap-2`}
					>
						<ArrowLeft aria-hidden="true" className="h-6 w-6" />
						กลับ
					</Link>
					<p aria-live="polite" className="text-xl font-bold">
						ข้อ {index + 1} จาก {set.questions.length}
					</p>
					<button
						onClick={() => void media.play(NAMING_PROMPT_AUDIO)}
						disabled={recording || busy}
						aria-label="ฟังโจทย์"
						className={namingSecondary}
					>
						<Volume2 aria-hidden="true" className="h-7 w-7" />
						<span className="sr-only">ฟังโจทย์</span>
					</button>
				</header>
				<progress
					aria-label="ความคืบหน้าการฝึก"
					max={set.questions.length}
					value={responses.length}
					className="my-3 h-2 w-full accent-[#118a82]"
				/>
				<h1
					ref={heading}
					tabIndex={-1}
					className="mb-3 text-center text-2xl font-bold outline-none sm:text-3xl"
				>
					ภาพนี้คืออะไร
				</h1>
				<div className="flex flex-1 flex-col items-center justify-center gap-4">
					<TrainingImageFrame
						key={question.id}
						size="naming"
						alt={`ภาพโจทย์ข้อ ${index + 1}`}
						imageSrc={question.imageSrc}
						onImageError={() => setImageFailed(true)}
					/>
					{imageFailed && (
						<p role="alert" className="text-lg text-red-800">
							ภาพไม่ขึ้น กรุณาข้ามข้อนี้
						</p>
					)}
					<button
						disabled={
							busy ||
							submitted ||
							media.micState === "requesting" ||
							imageFailed
						}
						onClick={() => {
							setError("");
							if (readyToSend) void submit();
							else void media.toggleRecording();
						}}
						aria-label={micLabel}
						aria-pressed={media.micState === "recording"}
						className={`flex h-36 w-36 shrink-0 flex-col items-center justify-center gap-2 rounded-full text-white shadow-lg outline-none transition focus-visible:ring-4 focus-visible:ring-teal-300 focus-visible:ring-offset-4 disabled:opacity-60 sm:h-44 sm:w-44 ${recording ? "bg-red-700 hover:bg-red-800" : "bg-[#118a82] hover:bg-[#0c706a]"}`}
					>
						{busy || media.micState === "requesting" ? (
							<LoaderCircle
								aria-hidden="true"
								className="h-16 w-16 animate-spin"
							/>
						) : media.micState === "recording" ? (
							<Square
								aria-hidden="true"
								className="h-16 w-16"
								fill="currentColor"
							/>
						) : submitted ? (
							<Check aria-hidden="true" className="h-16 w-16" />
						) : readyToSend ? (
							<Send aria-hidden="true" className="h-16 w-16" />
						) : (
							<Mic aria-hidden="true" className="h-16 w-16 sm:h-20 sm:w-20" />
						)}
						<span className="text-xl font-bold">{micLabel}</span>
					</button>
					<p
						role="status"
						className="min-h-7 text-center text-lg font-semibold text-[#176e66]"
					>
						{media.micState === "recording"
							? "กำลังบันทึกเสียง"
							: submitted
								? correct === true
									? "ถูกต้อง"
									: correct === false
										? "ลองอีกครั้งได้นะ"
										: "ส่งเสียงแล้ว"
								: media.blob
									? "บันทึกเสียงแล้ว"
									: ""}
					</p>
					{submitted && correct === false && (
						<button
							onClick={() => {
								media.reset();
								setSubmitted(false);
								setCorrect(undefined);
								setError("");
							}}
							className={`${namingSecondary} gap-2`}
						>
							<RotateCcw aria-hidden="true" />
							ลองอีกครั้ง
						</button>
					)}
					<div
						aria-live="polite"
						aria-atomic="true"
						className="w-full max-w-lg text-center"
					>
						{revealed ? (
							<div className="rounded-2xl bg-[#e3f5ed] p-4">
								<p className="text-3xl font-bold text-[#118a82]">
									{question.answer}
								</p>
								{answerAudio && (
									<button
										onClick={() => void media.play(answerAudio)}
										disabled={recording || busy}
										className={`${namingSecondary} mt-3 gap-2`}
									>
										<Volume2 aria-hidden="true" />
										ฟังเฉลย
									</button>
								)}
							</div>
						) : hints > 0 ? (
							<p className="rounded-2xl bg-[#f0f9f5] p-4 text-xl leading-8">
								{hints === 1 ? question.featureHint : question.initialHint}
							</p>
						) : null}
					</div>
				</div>
				{error && (
					<p
						role="alert"
						className="mt-3 rounded-xl bg-red-50 p-3 text-center text-lg text-red-800"
					>
						{error}
					</p>
				)}
				<footer className="mt-4 border-t border-[#d7e9e4] pt-4">
					<div className="grid grid-cols-2 gap-3">
						<button
							onClick={() => {
								if (hints < 2) hint();
								else {
									if (!lock()) return;
									media.stopAudio();
									setRevealed(true);
									actionLock.current = false;
								}
							}}
							disabled={recording || busy || revealed || imageFailed}
							aria-label={hints < 2 ? `คำใบ้ ${hints + 1} จาก 2` : "เปิดเฉลย"}
							className={`${namingSecondary} gap-2`}
						>
							<Lightbulb aria-hidden="true" className="h-7 w-7" />
							{hints < 2 ? "คำใบ้" : "เฉลย"}
						</button>
						<button
							onClick={() => next(false)}
							disabled={
								busy ||
								recording ||
								imageFailed ||
								(!revealed && !submitted && (!media.blob || Boolean(sessionId)))
							}
							className={`${namingButton} gap-2`}
						>
							{index === set.questions.length - 1 ? "เสร็จแล้ว" : "ถัดไป"}
							<ArrowRight aria-hidden="true" className="h-7 w-7" />
						</button>
					</div>
					<button
						onClick={() => next(true)}
						disabled={busy || recording}
						className="mx-auto mt-2 flex min-h-14 items-center justify-center gap-2 rounded-xl px-6 text-lg font-semibold text-[#426c63] focus-visible:outline-4 focus-visible:outline-teal-700 disabled:opacity-50"
					>
						<SkipForward aria-hidden="true" className="h-6 w-6" />
						ข้าม
					</button>
				</footer>
			</section>
		</main>
	);
}
