"use client";
import Link from "next/link";
import {
	practicePage,
	practiceScene,
	practiceQuietButton,
	practiceAction,
	practiceMic,
} from "./practiceStyles";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { usePracticeFlow } from "../hooks/usePracticeFlow";
import { QuestionDots } from "./QuestionDots";
import { PracticeFeedback } from "./PracticeFeedback";
import type { CatalogQuestion } from "../data/namingCatalog";
import {
	approvedPatientAudio,
	patientAudioManifest,
} from "../data/patientAudioManifest";
import {
	loadAssignedNamingSet,
	sendNamingResponse,
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
		<main className={practicePage}>
			<div className="mx-auto flex min-h-[calc(100dvh_-_var(--preview-bar-height,0px))] max-w-3xl flex-col px-6 py-5">
				<Link className={`${practiceQuietButton} self-start`} href={homeHref}>
					<ArrowLeft aria-hidden="true" className="mr-2 h-7 w-7" />
					กลับ
				</Link>
				<section className="flex flex-1 flex-col items-center justify-center py-8 text-center">
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
									className={`${namingButton} mt-7 min-h-16 w-full max-w-sm gap-3 rounded-full text-2xl`}
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
											? "หยุดบันทึกแล้วระบบส่งเสียงตรวจและไปต่ออัตโนมัติ วงกลมสีเขียวคือทำแล้ว ข้อที่ข้ามกลับมากดทำได้ และจะบันทึกจบรอบเมื่อทำครบทุกข้อ"
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
	const flow = usePracticeFlow<RoundResponse>(set.questions.length);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [completion, setCompletion] = useState<
		"idle" | "saving" | "saved" | "failed"
	>("idle");
	const [saveAttempt, setSaveAttempt] = useState(0);
	const busyRef = useRef(false);
	const alive = useRef(true);
	const { play: playFeedback, stopAudio: stopFeedback } =
		useNamingMedia(setError);
	const question = set.questions[flow.index];
	const entry = flow.entries[flow.index];
	const canSave = Boolean(
		sessionId &&
			flow.finished &&
			flow.entries.every((item) => item.response?.submitted),
	);
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);
	useEffect(() => {
		const source = approvedPatientAudio(flow.cue?.audioSrc);
		if (source) void playFeedback(source, flow.continueNow);
		return stopFeedback;
	}, [flow.cue, flow.continueNow, playFeedback, stopFeedback]);
	useEffect(() => {
		if (!canSave || !sessionId) return;
		let active = true;
		async function save() {
			setCompletion("saving");
			const result = await completeNamingSession(sessionId!, schedule);
			if (active) setCompletion(result.success ? "saved" : "failed");
		}
		void save();
		return () => {
			active = false;
		};
	}, [canSave, sessionId, schedule, saveAttempt]);
	async function submit(
		blob: Blob,
		hints: number,
		revealed: boolean,
		timeMs: number,
	) {
		if (busyRef.current || flow.cue || entry.status === "answered") return;
		busyRef.current = true;
		setBusy(true);
		setError("");
		try {
			const result =
				sessionId && set.backendSetId && set.questionIds
					? await sendNamingResponse({
							sessionId,
							setId: set.backendSetId,
							questionId: set.questionIds[flow.index],
							hintsUsed: revealed ? 3 : hints,
							responseTimeMs: timeMs,
							voiceFile: blob,
						})
					: {};
			if (!alive.current) return;
			flow.complete(
				{
					questionId: question.id,
					skipped: false,
					hintsUsed: revealed ? 3 : hints,
					revealed,
					recorded: true,
					submitted: Boolean(sessionId),
					correct: result.correct,
				},
				result.correct,
			);
		} catch {
			if (alive.current) setError("ส่งเสียงไม่ได้ กรุณาลองอีกครั้ง");
		} finally {
			busyRef.current = false;
			if (alive.current) setBusy(false);
		}
	}
	if (flow.finished)
		return (
			<main className={namingPage}>
				<section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 text-center sm:p-10">
					<div aria-hidden="true" className="text-8xl">
						🌈
					</div>
					<h1 className="mt-6 text-3xl font-bold">ทำครบแล้ว เก่งมากค่ะ</h1>
					<p className="mt-4 text-xl">ขอบคุณที่ตั้งใจฝึก</p>
					<p role="status" className="mt-4 text-lg text-[#526a66]">
						{completion === "saving"
							? "กำลังบันทึก…"
							: completion === "saved"
								? "บันทึกแล้ว"
								: completion === "failed"
									? "ยังบันทึกไม่ได้"
									: "จบการฝึกรอบนี้แล้ว"}
					</p>
					{completion === "failed" && (
						<button
							onClick={() => setSaveAttempt((value) => value + 1)}
							className={`${namingSecondary} mt-4`}
						>
							ลองบันทึกใหม่
						</button>
					)}
					<div className="mt-7 grid gap-4 sm:grid-cols-2">
						<button
							onClick={onRepeat}
							disabled={completion === "saving"}
							className={`${namingSecondary} gap-2`}
						>
							<RotateCcw aria-hidden="true" />
							ฝึกซ้ำ
						</button>
						<Link href={homeHref} className={`${namingButton} gap-2`}>
							<ArrowRight aria-hidden="true" />
							กลับหน้าหลัก
						</Link>
					</div>
				</section>
			</main>
		);
	return (
		<main className={practicePage}>
			<section className={practiceScene}>
				<header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pb-2">
					<Link href={homeHref} className={`${practiceQuietButton} justify-self-start`}>
						<ArrowLeft aria-hidden="true" />
						กลับ
					</Link>
					<p
						aria-live="polite"
						className="text-lg font-semibold tabular-nums text-[#436c65] sm:text-xl"
					>
						ข้อ {flow.index + 1} จาก {set.questions.length}
					</p>
					<QuestionDots
						statuses={flow.entries.map((item) => item.status)}
						current={flow.index}
						disabled={busy || Boolean(flow.cue)}
						onSelect={(index) => {
							if (busyRef.current) return;
							setError("");
							flow.goTo(index);
						}}
					/>
				</header>
				<NamingQuestion
					key={`${flow.index}-${flow.revision}`}
					question={question}
					order={flow.index + 1}
					locked={busy || Boolean(flow.cue) || entry.status === "answered"}
					answered={entry.status === "answered"}
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
				<footer className="flex flex-wrap items-center justify-between gap-3 py-2 text-[#638078]">
					<p className="text-sm text-[#829990]">เหลือ {flow.remaining} ข้อ</p>
					<button
						type="button"
						onClick={() => {
							if (busyRef.current) return;
							setError("");
							flow.skip();
						}}
						disabled={busy || Boolean(flow.cue)}
						className={practiceQuietButton}
					>
						{entry.status === "answered" ? (
							<>
								<ArrowRight aria-hidden="true" />
								ถัดไป
							</>
						) : (
							<>
								<SkipForward aria-hidden="true" />
								ข้าม
							</>
						)}
					</button>
				</footer>
				<PracticeFeedback cue={flow.cue} onContinue={flow.continueNow} />
			</section>
		</main>
	);
}

function NamingQuestion({
	question,
	order,
	locked,
	answered,
	busy,
	onSubmit,
}: {
	question: CatalogQuestion;
	order: number;
	locked: boolean;
	answered: boolean;
	busy: boolean;
	onSubmit: (
		blob: Blob,
		hints: number,
		revealed: boolean,
		timeMs: number,
	) => Promise<void>;
}) {
	const [hints, setHints] = useState(0);
	const [revealed, setRevealed] = useState(false);
	const [error, setError] = useState("");
	const [imageFailed, setImageFailed] = useState(false);
	const media = useNamingMedia(setError);
	const { stopAudio } = media;
	useEffect(() => {
		if (locked) stopAudio();
	}, [locked, stopAudio]);
	const sentBlob = useRef<Blob | undefined>(undefined);
	const startedAt = useRef(0);
	const heading = useRef<HTMLHeadingElement>(null);
	const recording =
		media.micState === "recording" || media.micState === "requesting";
	const submitBlob = useCallback(
		(blob: Blob) =>
			onSubmit(
				blob,
				hints,
				revealed,
				Math.max(0, Date.now() - startedAt.current),
			),
		[onSubmit, hints, revealed],
	);
	useEffect(() => {
		startedAt.current = Date.now();
		heading.current?.focus();
	}, []);
	useEffect(() => {
		if (media.blob && sentBlob.current !== media.blob && !locked) {
			sentBlob.current = media.blob;
			void submitBlob(media.blob);
		}
	}, [media.blob, locked, submitBlob]);
	const micLabel = busy
		? "กำลังส่ง…"
		: media.micState === "recording"
			? "หยุด"
			: media.micState === "requesting"
				? "รอไมโครโฟน…"
				: media.blob
					? "ส่งเสียงอีกครั้ง"
					: "แตะเพื่อพูด";
	return (
		<div className="grid flex-1 items-center gap-5 py-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:gap-10 lg:py-2">
			<div className="flex min-w-0 flex-col items-center justify-center gap-2">
				<h1
					ref={heading}
					tabIndex={-1}
					className="text-center text-3xl font-semibold leading-snug text-[#31584f] outline-none sm:text-4xl"
				>
					ภาพนี้คืออะไร
				</h1>
				<TrainingImageFrame
					size="naming"
					alt={`ภาพโจทย์ข้อ ${order}`}
					imageSrc={question.imageSrc}
					onImageError={() => setImageFailed(true)}
				/>
			</div>
			<div className="flex min-w-0 flex-col items-center justify-center gap-5 lg:gap-7">
				{answered ? (
					<p className="flex min-h-36 items-center gap-3 text-2xl font-semibold text-[#118a82]">
						<Check aria-hidden="true" className="h-12 w-12" />
						ทำข้อนี้แล้ว
					</p>
				) : (
					<>
						<button
							type="button"
							disabled={
								locked || media.micState === "requesting" || imageFailed
							}
							aria-label={micLabel}
							aria-pressed={media.micState === "recording"}
							onClick={() => {
								setError("");
								media.stopAudio();
								if (media.blob) void submitBlob(media.blob);
								else void media.toggleRecording();
							}}
							className={`${practiceMic} ${recording ? "bg-[linear-gradient(150deg,#6fbed1,#286e8d)]" : "bg-[linear-gradient(150deg,#5acdb4,#168a7b_75%)]"}`}
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
						<p
							role="status"
							className="text-center text-xl font-semibold text-[#31786e]"
						>
							{micLabel}
						</p>
					</>
				)}
				<div className="flex flex-wrap items-center justify-center gap-3">
					<button
						type="button"
						disabled={locked || recording}
						onClick={() => void media.play(NAMING_PROMPT_AUDIO)}
						className={practiceAction}
					>
						<Volume2 aria-hidden="true" className="h-5 w-5" />
						ฟังโจทย์
					</button>
					{!answered && (
						<button
							type="button"
							disabled={locked || recording || revealed}
							onClick={() => {
								media.stopAudio();
								if (hints < 2) {
									const next = hints + 1;
									setHints(next);
									const audio =
										patientAudioManifest.namingHints[`${question.id}-${next}`];
									if (audio) void media.play(audio);
								} else setRevealed(true);
							}}
							className={practiceAction}
						>
							<Lightbulb aria-hidden="true" className="h-5 w-5" />
							{hints < 2 ? "คำใบ้" : "เฉลย"}
						</button>
					)}
					{media.blob && !locked && (
						<button
							type="button"
							onClick={() => void media.toggleRecording()}
							className={practiceQuietButton}
						>
							พูดใหม่
						</button>
					)}
				</div>
				{!answered && (
					<div
						role="status"
						aria-live="polite"
						className="max-w-sm text-center"
					>
						{revealed ? (
							<>
								<p className="text-3xl font-semibold text-[#118a82]">
									{question.answer}
								</p>
								{patientAudioManifest.namingAnswers[question.id] && (
									<button
										onClick={() =>
											void media.play(
												patientAudioManifest.namingAnswers[question.id],
											)
										}
										disabled={locked || recording}
										className={`${practiceAction} mt-3`}
									>
										<Volume2 aria-hidden="true" />
										ฟังเฉลย
									</button>
								)}
							</>
						) : hints > 0 ? (
							<p className="text-xl leading-8 text-[#526f65]">
								{hints === 1 ? question.featureHint : question.initialHint}
							</p>
						) : null}
					</div>
				)}
				{imageFailed && (
					<p role="alert" className="text-lg text-amber-900">
						ภาพยังไม่ขึ้น กรุณาข้ามไว้ก่อน
					</p>
				)}
				{error && (
					<p role="alert" className="text-lg text-amber-900">
						{error}
					</p>
				)}
			</div>
		</div>
	);
}
