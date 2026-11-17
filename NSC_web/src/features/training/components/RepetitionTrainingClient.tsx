"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	Headphones,
	LoaderCircle,
	Mic,
	Play,
	RotateCcw,
	SkipForward,
	Square,
	Volume2,
} from "lucide-react";
import { getAuthSession } from "@/features/auth/services/authSession";
import {
	findRepetitionSet,
	pendingRepetitionAudio,
	repetitionAudio,
	repetitionCatalog,
	type RepetitionQuestion,
} from "../data/repetitionCatalog";
import { approvedPatientAudio } from "../data/patientAudioManifest";
import { useNamingMedia } from "../hooks/useNamingMedia";
import { usePracticeFlow } from "../hooks/usePracticeFlow";
import {
	finishRepetitionSession,
	loadAssignedRepetitionSet,
	sendRepetitionResponse,
	startRepetitionSession,
	type RepetitionRunSet,
} from "../services/repetitionFrontendService";
import { namingButton, namingSecondary } from "./NamingLibrary";
import { PracticeFeedback } from "./PracticeFeedback";
import { QuestionDots } from "./QuestionDots";
import {
	practiceAction,
	practiceMic,
	practicePage,
	practiceQuietButton,
	practiceScene,
} from "./practiceStyles";

export function RepetitionLibrary({ preview = false }: { preview?: boolean }) {
	const base = preview
		? "/dev/preview/repetition"
		: "/patient/training/repetition";
	return (
		<main className={practicePage}>
			<section className={`${practiceScene} py-6`}>
				<Link
					href={preview ? "/dev/preview/returning" : "/patient/home"}
					className={`${practiceQuietButton} self-start`}
				>
					<ArrowLeft aria-hidden="true" />
					กลับ
				</Link>
				<h1 className="my-7 text-3xl font-bold">พูดตาม</h1>
				{["easy", "medium", "hard"].map((level) => (
					<section key={level} className="mb-8">
						<h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
							<Headphones aria-hidden="true" />
							{repetitionCatalog.find((set) => set.level === level)?.category}
						</h2>
						<div className="grid gap-4 sm:grid-cols-3">
							{repetitionCatalog
								.filter((set) => set.level === level)
								.map((set) => {
									const pending = pendingRepetitionAudio(set).length;
									return (
										<Link
											key={set.id}
											href={`${base}/sets/${set.id}`}
											className="rounded-3xl bg-white p-6 shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-teal-200"
										>
											<h3 className="text-2xl font-semibold">
												ชุด {set.number}
											</h3>
											<p className="mt-2 text-lg">{set.questions.length} ข้อ</p>
											<p className="mt-4 text-base text-[#638078]">
												{pending ? `รอเสียง ${pending} ข้อ` : "พร้อมฝึก"}
											</p>
										</Link>
									);
								})}
						</div>
					</section>
				))}
			</section>
		</main>
	);
}

export function RepetitionTrainingClient({
	setId,
	assignedSetId,
	schedule,
	preview = false,
}: {
	setId?: string;
	assignedSetId?: string;
	schedule?: string;
	preview?: boolean;
}) {
	const home = preview ? "/dev/preview/repetition" : "/patient/training/today";
	const [set, setSet] = useState<RepetitionRunSet>();
	const [error, setError] = useState("");
	const [loaded, setLoaded] = useState(false);
	const [sessionId, setSessionId] = useState<string>();
	const [started, setStarted] = useState(false);
	const [starting, setStarting] = useState(false);
	const [round, setRound] = useState(0);
	const [attempt, setAttempt] = useState(0);
	const startLock = useRef(false);
	const alive = useRef(false);
	useEffect(() => {
		alive.current = true;
		let active = true;
		(async () => {
			try {
				const result = assignedSetId
					? await loadAssignedRepetitionSet(assignedSetId)
					: findRepetitionSet(setId ?? "");
				if (!result) throw new Error("ไม่พบชุดพูดตาม");
				if (active) setSet(result);
			} catch (e) {
				if (active) setError(e instanceof Error ? e.message : "โหลดชุดฝึกไม่ได้");
			} finally {
				if (active) setLoaded(true);
			}
		})();
		return () => {
			active = false;
			alive.current = false;
		};
	}, [setId, assignedSetId, attempt]);
	async function start() {
		if (
			startLock.current ||
			!set ||
			(!preview && pendingRepetitionAudio(set).length)
		)
			return;
		startLock.current = true;
		setStarting(true);
		setError("");
		try {
			if (set.backendSetId) {
				const auth = getAuthSession();
				if (!auth || auth.role !== "patient" || !auth.user.patientId)
					throw new Error("กรุณาเข้าสู่ระบบคนไข้");
				const id = await startRepetitionSession(
					set.backendSetId,
					auth.user.patientId,
					round === 0 ? schedule : undefined,
				);
				if (!alive.current) return;
				setSessionId(id);
			}
			if (alive.current) setStarted(true);
		} catch (e) {
			if (alive.current) setError(e instanceof Error ? e.message : "เริ่มฝึกไม่ได้");
		} finally {
			startLock.current = false;
			if (alive.current) setStarting(false);
		}
	}
	if (started && set)
		return (
			<RepetitionRound
				key={round}
				set={set}
				sessionId={sessionId}
				schedule={round === 0 ? schedule : undefined}
				homeHref={home}
				onRepeat={() => {
					setStarted(false);
					setSessionId(undefined);
					setRound((value) => value + 1);
				}}
			/>
		);
	return (
		<main className={practicePage}>
			<section className={`${practiceScene} max-w-3xl`}>
				<Link href={home} className={`${practiceQuietButton} self-start`}>
					<ArrowLeft aria-hidden="true" />
					กลับ
				</Link>
				<div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
					{!loaded ? (
						<p role="status" className="text-xl">
							กำลังโหลด…
						</p>
					) : set ? (
						<>
							<Headphones
								aria-hidden="true"
								className="mb-6 h-20 w-20 text-[#118a82]"
							/>
							<h1 className="text-4xl font-semibold">พูดตาม</h1>
							<p className="mt-4 text-xl text-[#638078]">
								{set.category} · ชุด {set.number} · {set.questions.length} ข้อ
							</p>
							<p className="mt-8 text-2xl font-semibold">ฟัง แล้วพูดตาม</p>
							{pendingRepetitionAudio(set).length > 0 && (
								<p role="status" className="mt-4 text-lg text-[#638078]">
									ยังรอเสียงโจทย์ {pendingRepetitionAudio(set).length} ข้อ
								</p>
							)}
							<button
								type="button"
								onClick={start}
								disabled={
									starting ||
									(!preview && pendingRepetitionAudio(set).length > 0)
								}
								className={`${namingButton} mt-7 min-h-16 w-full max-w-sm gap-3 rounded-full text-2xl`}
							>
								{starting ? (
									<LoaderCircle aria-hidden="true" className="animate-spin" />
								) : (
									<Play aria-hidden="true" />
								)}
								{starting ? "กำลังเริ่ม…" : preview ? "ดูหน้าฝึก" : "เริ่มฝึก"}
							</button>
						</>
					) : (
						<button
							className={namingSecondary}
							onClick={() => {
								setLoaded(false);
								setError("");
								setAttempt((value) => value + 1);
							}}
						>
							ลองโหลดใหม่
						</button>
					)}
					{error && (
						<p role="alert" className="mt-5 text-lg text-amber-900">
							{error}
						</p>
					)}
				</div>
			</section>
		</main>
	);
}

type RepetitionResponse = { correct?: boolean; submitted: boolean };
export function RepetitionRound({
	set,
	sessionId,
	schedule,
	homeHref,
	onRepeat,
}: {
	set: RepetitionRunSet;
	sessionId?: string;
	schedule?: string;
	homeHref: string;
	onRepeat: () => void;
}) {
	const flow = usePracticeFlow<RepetitionResponse>(set.questions.length, {
		perQuestionFeedback: false,
	});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);
	const [saveAttempt, setSaveAttempt] = useState(0);
	const lock = useRef(false);
	const alive = useRef(false);
	const { play, stopAudio } = useNamingMedia(setError);
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);
	useEffect(() => {
		const source = approvedPatientAudio(flow.cue?.audioSrc);
		if (source) void play(source, flow.continueNow);
		return stopAudio;
	}, [flow.cue, flow.continueNow, play, stopAudio]);
	const canSave = Boolean(
		sessionId &&
			flow.finished &&
			flow.entries.every((item) => item.response?.submitted),
	);
	const saving = canSave && !saved && !error;
	const evaluated = flow.entries.filter(
		(item) => typeof item.response?.correct === "boolean",
	);
	useEffect(() => {
		if (!canSave || !sessionId) return;
		let active = true;
		finishRepetitionSession(sessionId, schedule)
			.then(() => {
				if (active) setSaved(true);
			})
			.catch(() => {
				if (active) setError("ยังบันทึกการจบชุดไม่ได้ กรุณาลองอีกครั้ง");
			});
		return () => {
			active = false;
		};
	}, [canSave, sessionId, schedule, saveAttempt]);
	async function submit(blob: Blob, timeMs: number) {
		if (
			lock.current ||
			flow.cue ||
			flow.entries[flow.index].status === "answered"
		)
			return;
		lock.current = true;
		setBusy(true);
		setError("");
		try {
			const result =
				sessionId && set.questionIds
					? await sendRepetitionResponse(
							sessionId,
							set.questionIds[flow.index],
							blob,
							timeMs,
						)
					: { correct: undefined };
			if (alive.current)
				flow.complete(
					{
						correct: result.correct,
						submitted: Boolean(sessionId && set.questionIds),
					},
					result.correct,
				);
		} catch {
			if (alive.current) setError("ส่งเสียงไม่ได้ กรุณาลองอีกครั้ง");
		} finally {
			lock.current = false;
			if (alive.current) setBusy(false);
		}
	}
	if (flow.finished)
		return (
			<main className={practicePage}>
				<section
					className={`${practiceScene} items-center justify-center text-center`}
				>
					<div aria-hidden="true" className="text-8xl">
						🌈
					</div>
					<h1 className="mt-6 text-3xl font-bold">ทำครบแล้ว เก่งมากค่ะ</h1>
					<p className="mt-4 text-xl">ขอบคุณที่ตั้งใจฝึก</p>
					<p className="mt-3 text-lg text-[#638078]">
						ทำครบ {flow.answered} จาก {set.questions.length} ข้อ
					</p>
					<details className="mt-5 text-base leading-7 text-[#638078]">
						<summary className="cursor-pointer py-3">ผลการฝึกรอบนี้</summary>
						{evaluated.length ? (
							<p>
								ตอบถูก{" "}
								{
									evaluated.filter((item) => item.response?.correct === true)
										.length
								}{" "}
								จาก {evaluated.length} ข้อที่ระบบตรวจแล้ว
								{evaluated.length < flow.answered
									? ` · รอผลอีก ${flow.answered - evaluated.length} ข้อ`
									: ""}
							</p>
						) : (
							<p>ยังไม่มีผลคะแนนจากระบบ</p>
						)}
					</details>
					<p role="status" className="mt-4 text-lg text-[#638078]">
						{saving ? "กำลังบันทึก…" : saved ? "บันทึกแล้ว" : "จบการฝึกรอบนี้แล้ว"}
					</p>
					{error && (
						<>
							<p role="alert" className="mt-4 text-amber-900">
								{error}
							</p>
							<button
								className={`${namingSecondary} mt-4`}
								onClick={() => {
									setError("");
									setSaveAttempt((value) => value + 1);
								}}
							>
								ลองบันทึกใหม่
							</button>
						</>
					)}
					<div className="mt-7 flex flex-wrap justify-center gap-4">
						<button
							disabled={saving}
							className={`${namingSecondary} gap-2`}
							onClick={onRepeat}
						>
							<RotateCcw aria-hidden="true" />
							ฝึกซ้ำ
						</button>
						<Link className={`${namingButton} gap-2`} href={homeHref}>
							<ArrowRight aria-hidden="true" />
							กลับหน้ารายการ
						</Link>
					</div>
				</section>
			</main>
		);
	return (
		<main className={practicePage}>
			<section className={practiceScene}>
				<header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pb-2">
					<Link
						href={homeHref}
						className={`${practiceQuietButton} justify-self-start`}
					>
						<ArrowLeft aria-hidden="true" />
						กลับ
					</Link>
					<p
						aria-live="polite"
						className="whitespace-nowrap text-lg font-semibold"
					>
						ข้อ {flow.index + 1} จาก {set.questions.length}
					</p>
					<QuestionDots
						statuses={flow.entries.map((item) => item.status)}
						current={flow.index}
						disabled={busy || Boolean(flow.cue)}
						onSelect={(index) => {
							if (!lock.current) {
								setError("");
								flow.goTo(index);
							}
						}}
					/>
				</header>
				<RepetitionQuestionView
					key={`${flow.index}-${flow.revision}`}
					question={set.questions[flow.index]}
					answered={flow.entries[flow.index].status === "answered"}
					locked={busy || Boolean(flow.cue)}
					busy={busy}
					onSubmit={submit}
				/>
				{error && (
					<p
						role="alert"
						className="my-3 rounded-2xl bg-amber-50 p-4 text-center text-lg text-amber-900"
					>
						{error}
					</p>
				)}
				<footer className="flex items-center justify-between gap-3 py-2">
					<p className="text-sm text-[#638078]">เหลือ {flow.remaining} ข้อ</p>
					<button
						disabled={busy || Boolean(flow.cue)}
						className={practiceQuietButton}
						onClick={() => {
							if (!lock.current) {
								setError("");
								flow.skip();
							}
						}}
					>
						<SkipForward aria-hidden="true" />
						{flow.entries[flow.index].status === "answered" ? "ถัดไป" : "ข้าม"}
					</button>
				</footer>
				<PracticeFeedback cue={flow.cue} onContinue={flow.continueNow} />
			</section>
		</main>
	);
}

export function RepetitionQuestionView({
	question,
	locked,
	answered,
	busy,
	onSubmit,
}: {
	question: RepetitionQuestion;
	locked: boolean;
	answered: boolean;
	busy: boolean;
	onSubmit: (blob: Blob, timeMs: number) => Promise<void>;
}) {
	const [error, setError] = useState("");
	const media = useNamingMedia(setError);
	const { stopAudio } = media;
	const sent = useRef<Blob | undefined>(undefined);
	const started = useRef(0);
	const heading = useRef<HTMLHeadingElement>(null);
	const source = approvedPatientAudio(repetitionAudio(question));
	const recording =
		media.micState === "recording" || media.micState === "requesting";
	useEffect(() => {
		started.current = Date.now();
		heading.current?.focus();
	}, []);
	useEffect(() => {
		if (locked) stopAudio();
	}, [locked, stopAudio]);
	const send = useCallback(
		(blob: Blob) => onSubmit(blob, Math.max(0, Date.now() - started.current)),
		[onSubmit],
	);
	useEffect(() => {
		if (
			media.blob &&
			sent.current !== media.blob &&
			!locked &&
			source &&
			!answered
		) {
			sent.current = media.blob;
			void send(media.blob);
		}
	}, [media.blob, locked, source, answered, send]);
	const label = busy
		? "กำลังส่ง…"
		: media.micState === "recording"
			? "หยุด"
			: media.micState === "requesting"
				? "รอไมโครโฟน…"
				: !source
					? "รอเสียงโจทย์"
					: media.blob
						? "ส่งเสียงอีกครั้ง"
						: "แตะเพื่อพูด";
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-5 py-3 sm:gap-6">
			<div className="w-full max-w-4xl text-center">
				<p className="mb-4 text-lg font-semibold text-[#638078]">พูดตาม</p>
				<h1
					ref={heading}
					tabIndex={-1}
					className="text-balance text-4xl font-semibold leading-snug text-[#31584f] outline-none sm:text-5xl"
				>
					{question.text}
				</h1>
			</div>
			<div className="flex w-full min-w-0 flex-col items-center justify-center gap-3">
				{answered ? (
					<p className="flex min-h-36 items-center gap-3 text-2xl font-semibold text-[#118a82]">
						<Check aria-hidden="true" className="h-12 w-12" />
						ทำข้อนี้แล้ว
					</p>
				) : (
					<>
						<button
							type="button"
							disabled={locked || !source || media.micState === "requesting"}
							aria-label={label}
							aria-pressed={media.micState === "recording"}
							className={`${practiceMic} ${recording ? "bg-[linear-gradient(150deg,#6fbed1,#286e8d)]" : "bg-[linear-gradient(150deg,#5acdb4,#168a7b_75%)]"}`}
							onClick={() => {
								setError("");
								media.stopAudio();
								if (media.blob) void send(media.blob);
								else void media.toggleRecording();
							}}
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
							) : (
								<Mic
									aria-hidden="true"
									className="h-20 w-20"
									strokeWidth={1.7}
								/>
							)}
						</button>
						<p role="status" className="text-xl font-semibold text-[#31786e]">
							{label}
						</p>
					</>
				)}
				<button
					type="button"
					disabled={locked || recording || !source}
					className={practiceAction}
					onClick={() => void media.play(source)}
				>
					<Volume2 aria-hidden="true" />
					ฟังโจทย์
				</button>
				{!source && <p className="text-base text-[#638078]">ยังไม่มีเสียงโจทย์</p>}
				{error && (
					<p role="alert" className="text-lg text-amber-900">
						{error}
					</p>
				)}
			</div>
		</div>
	);
}
