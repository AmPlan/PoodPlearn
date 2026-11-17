"use client";
import { PracticeHints } from "@/features/training/components/PracticeHints";
import Link from "next/link";
import {
	practicePage,
	practiceScene,
	practiceQuietButton,
	practiceAction,
	practiceMic,
	practiceImageScene,
	practiceImageHeading,
	practiceControls,
} from "@/features/training/components/practiceStyles";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	LoaderCircle,
	Mic,
	SkipForward,
	Square,
	Volume2,
} from "lucide-react";
import { useNamingMedia } from "@/features/training/hooks/useNamingMedia";
import { usePracticeFlow } from "@/features/training/hooks/usePracticeFlow";
import { QuestionDots } from "@/features/training/components/QuestionDots";
import { PracticeFeedback } from "@/features/training/components/PracticeFeedback";
import { TrainingImageFrame } from "@/features/training/components/TrainingImageFrame";
import { namingSecondary } from "@/features/training/components/NamingLibrary";
import {
	approvedPatientAudio,
	patientAudioManifest,
} from "@/features/training/data/patientAudioManifest";
import {
	getStandardAssessmentSession,
	saveStandardAssessmentAnswer,
} from "../services/standardAssessmentService";
import type {
	AssessmentAnswer,
	SavedAssessmentAnswer,
	StandardAssessmentQuestion,
	StandardAssessmentSession,
} from "../types/assessment.types";

export function AssessmentSessionClient({
	previewSession,
}: {
	previewSession?: StandardAssessmentSession;
} = {}) {
	const preview =
		process.env.NODE_ENV === "development" && Boolean(previewSession);
	const [session, setSession] = useState<StandardAssessmentSession>();
	const [error, setError] = useState("");
	useEffect(() => {
		let active = true;
		async function load() {
			try {
				const result =
					preview && previewSession
						? { success: true as const, data: previewSession }
						: await getStandardAssessmentSession();
				if (!active) return;
				if (!result.success) throw new Error(result.errorMessage);
				if (!result.data.questions.length) throw new Error("empty assessment");
				setSession({
					...result.data,
					totalQuestions: result.data.questions.length,
				});
			} catch {
				if (active) setError("ยังโหลดแบบประเมินไม่ได้ กรุณากลับแล้วลองใหม่");
			}
		}
		void load();
		return () => {
			active = false;
		};
	}, [preview, previewSession]);
	const home = preview ? "/dev/preview/new" : "/patient/home";
	if (!session)
		return (
			<main className="flex min-h-dvh items-center justify-center bg-[#edf9f6] p-6 text-center text-xl text-[#173d3f]">
				<div>
					<p role={error ? "alert" : "status"}>{error || "กำลังโหลด…"}</p>
					{error && (
						<Link href={home} className={`${namingSecondary} mt-5`}>
							กลับ
						</Link>
					)}
				</div>
			</main>
		);
	return (
		<AssessmentRound
			key={session.sessionId}
			session={session}
			preview={preview}
			homeHref={home}
		/>
	);
}

export function AssessmentRound({
	session,
	preview,
	homeHref,
}: {
	session: StandardAssessmentSession;
	preview: boolean;
	homeHref: string;
}) {
	const router = useRouter();
	const flow = usePracticeFlow<SavedAssessmentAnswer>(session.questions.length);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const busyRef = useRef(false);
	const alive = useRef(true);
	const { play: playFeedback, stopAudio: stopFeedback } =
		useNamingMedia(setError);
	const question = session.questions[flow.index];
	const entry = flow.entries[flow.index];
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
		if (flow.finished)
			router.push(
				preview ? "/dev/preview/result" : "/patient/assessment/result",
			);
	}, [flow.finished, preview, router]);

	async function submit(answer: AssessmentAnswer) {
		if (busyRef.current || flow.cue || entry.status === "answered") return;
		busyRef.current = true;
		setBusy(true);
		setError("");
		try {
			const result = preview
				? {
						success: true as const,
						data: {
							answerId: `preview-${answer.questionId}`,
							questionId: answer.questionId,
							answerType: answer.answerType,
							selectedOptionId: answer.selectedOptionId,
							hintCountUsed: answer.hintCountUsed,
							savedAt: new Date().toISOString(),
						} as SavedAssessmentAnswer,
					}
				: await saveStandardAssessmentAnswer(answer);
			if (!alive.current) return;
			if (!result.success) throw new Error(result.errorMessage);
			flow.complete(result.data, result.data.isCorrect);
		} catch {
			if (alive.current) setError("ส่งคำตอบไม่ได้ กรุณาลองอีกครั้ง");
		} finally {
			busyRef.current = false;
			if (alive.current) setBusy(false);
		}
	}
	function select(index: number) {
		if (busyRef.current) return;
		setError("");
		flow.goTo(index);
	}
	if (flow.finished)
		return (
			<main className="flex min-h-dvh items-center justify-center bg-[#edf9f6] p-6 text-center">
				<section>
					<div aria-hidden="true" className="text-8xl">
						🌈
					</div>
					<h1 className="mt-6 text-3xl font-bold text-[#173d3f]">
						ทำครบแล้ว เก่งมากค่ะ
					</h1>
					<p role="status" className="mt-4 text-xl">
						กำลังสรุป…
					</p>
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
						className="text-lg font-semibold tabular-nums text-[#436c65] sm:text-xl"
					>
						ข้อ {flow.index + 1} จาก {session.questions.length}
					</p>
					<QuestionDots
						statuses={flow.entries.map((item) => item.status)}
						current={flow.index}
						disabled={busy || Boolean(flow.cue)}
						onSelect={select}
					/>
				</header>
				<AssessmentQuestion
					key={`${flow.index}-${flow.revision}`}
					question={question}
					locked={busy || Boolean(flow.cue) || entry.status === "answered"}
					answered={entry.status === "answered"}
					busy={busy}
					onSubmit={submit}
				/>
				{error && (
					<p
						role="alert"
						className="my-3 rounded-xl bg-amber-50 p-4 text-center text-lg text-amber-900"
					>
						{error}
					</p>
				)}
				<footer className="flex flex-wrap items-center justify-between gap-3 py-2 text-[#638078]">
					<p className="text-sm text-[#829990]">เหลือ {flow.remaining} ข้อ</p>
					<button
						type="button"
						disabled={busy || Boolean(flow.cue)}
						onClick={() => {
							if (busyRef.current) return;
							setError("");
							flow.skip();
						}}
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

export function AssessmentQuestion({
	practiceAnswer,
	question,
	locked,
	answered,
	busy,
	onSubmit,
}: {
	question: StandardAssessmentQuestion;
	practiceAnswer?: string;
	locked: boolean;
	answered: boolean;
	busy: boolean;
	onSubmit: (answer: AssessmentAnswer) => Promise<void>;
}) {
	const [error, setError] = useState("");
	const [hints, setHints] = useState(0);
	const [imageFailed, setImageFailed] = useState(false);
	const [choices] = useState(() => {
		const values = [...(question.choices ?? [])];
		if (question.interactionType === "image_choice") {
			for (let i = values.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[values[i], values[j]] = [values[j], values[i]];
			}
		}
		return values;
	});
	const media = useNamingMedia(setError);
	const { stopAudio } = media;
	useEffect(() => {
		if (locked) stopAudio();
	}, [locked, stopAudio]);
	const sentBlob = useRef<Blob | undefined>(undefined);
	const startedAt = useRef(0);
	const heading = useRef<HTMLHeadingElement>(null);
	const source = approvedPatientAudio(question.questionAudioSrc);
	const isVoice = ["voice_question", "repeat_after", "name_image"].includes(
		question.interactionType,
	);

	const recording =
		media.micState === "recording" || media.micState === "requesting";
	const missingRepeatAudio =
		question.interactionType === "repeat_after" && !source;
	const feature = question.hints?.find((hint) => hint.type === "feature");
	const initial = question.hints?.find((hint) => hint.type === "initial_sound");
	const correctChoice = choices.find((choice) => choice.isCorrect === true);
	const meta = useCallback(
		() => ({
			questionId: question.id,
			hintLevelUsed: Math.min(3, hints) as 0 | 1 | 2 | 3,
			hintCountUsed: Math.min(3, hints) as 0 | 1 | 2 | 3,
			responseTimeMs: Math.max(0, Date.now() - startedAt.current),
		}),
		[question.id, hints],
	);
	useEffect(() => {
		startedAt.current = Date.now();
		heading.current?.focus();
	}, []);
	useEffect(() => {
		if (media.blob && sentBlob.current !== media.blob && !locked) {
			sentBlob.current = media.blob;
			void onSubmit({
				...meta(),
				answerType: "mock_audio",
				voiceFile: media.blob,
			});
		}
	}, [media.blob, locked, onSubmit, meta]);
	const prompt =
		question.interactionType === "name_image"
			? "ภาพนี้คืออะไร"
			: question.promptText;
	const micLabel = busy
		? "กำลังส่ง…"
		: media.micState === "recording"
			? "หยุด"
			: media.micState === "requesting"
				? "รอไมโครโฟน…"
				: missingRepeatAudio
					? "รอเสียงโจทย์"
					: media.blob
						? "ส่งเสียงอีกครั้ง"
						: "แตะเพื่อพูด";
	const imageQuestion = Boolean(
		question.imageSrc ||
			question.imageUrl ||
			question.interactionType === "name_image",
	);
	return (
		<div
			className={
				imageQuestion && isVoice
					? practiceImageScene
					: "flex flex-1 flex-col items-center justify-center gap-4 py-3"
			}
		>
			<div className="flex min-w-0 flex-col items-center justify-center gap-3">
				{question.interactionType === "repeat_after" && (
					<p className="text-base font-semibold text-[#829990]">พูดตาม</p>
				)}
				<h1
					ref={heading}
					tabIndex={-1}
					className={
						question.interactionType === "repeat_after"
							? "max-w-4xl text-balance text-center text-4xl font-semibold leading-snug text-[#31584f] outline-none sm:text-5xl"
							: practiceImageHeading
					}
				>
					{prompt}
				</h1>
				{imageQuestion && (
					<TrainingImageFrame
						size="naming"
						imageSrc={question.imageSrc ?? question.imageUrl}
						alt={`ภาพโจทย์ข้อ ${question.order}`}
						onImageError={() => setImageFailed(true)}
					/>
				)}
			</div>
			<div className={practiceControls}>
				{answered ? (
					<p className="flex min-h-36 items-center gap-3 text-2xl font-semibold text-[#118a82]">
						<Check aria-hidden="true" className="h-12 w-12" />
						ทำข้อนี้แล้ว
					</p>
				) : isVoice ? (
					<>
						<button
							type="button"
							disabled={
								locked ||
								media.micState === "requesting" ||
								missingRepeatAudio ||
								imageFailed
							}
							aria-label={micLabel}
							aria-pressed={media.micState === "recording"}
							onClick={() => {
								setError("");
								media.stopAudio();
								if (media.blob)
									void onSubmit({
										...meta(),
										answerType: "mock_audio",
										voiceFile: media.blob,
									});
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
				) : question.interactionType === "image_choice" ? (
					<div className="flex w-full max-w-[1100px] flex-wrap justify-center gap-3 sm:gap-5 lg:gap-7">
						{choices.map((choice, i) => (
							<button
								key={choice.id}
								type="button"
								disabled={locked}
								aria-label={`เลือกภาพตัวเลือก ${i + 1}`}
								onClick={() =>
									void onSubmit({
										...meta(),
										answerType: "image_choice",
										selectedOptionId: choice.id,
										answerImageUrl:
											choice.imageSrc ?? choice.imageUrl ?? choice.id,
									})
								}
								className="group flex w-[calc(50%_-_0.375rem)] items-center justify-center rounded-[1.75rem] bg-white/90 p-2 shadow-[0_10px_36px_#13554a08] ring-1 ring-[#e5f0eb] outline-none transition duration-200 hover:bg-[#f5fcf8] hover:shadow-[0_14px_40px_#13554a12] hover:ring-[#a9dccc] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-[#9eddd1] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none sm:w-[calc(33.333%_-_1rem)] sm:rounded-[2rem] sm:p-3 lg:w-[min(340px,43dvh)]"
							>
								<TrainingImageFrame
									size="choice"
									imageSrc={choice.imageSrc ?? choice.imageUrl}
									alt={`ภาพตัวเลือก ${i + 1}`}
								/>
							</button>
						))}
					</div>
				) : (
					<div className="flex w-full max-w-3xl gap-6 sm:gap-12">
						{choices.map((choice) => (
							<button
								key={choice.id}
								type="button"
								disabled={locked}
								onClick={() =>
									void onSubmit({
										...meta(),
										answerType: "yes_no_choice",
										selectedOptionId: choice.id,
									})
								}
								className="flex min-h-52 min-w-0 flex-1 flex-col items-center justify-center gap-5 rounded-[2rem] bg-white p-5 text-2xl font-semibold shadow-[0_10px_36px_#13554a0c] ring-1 ring-[#d5e8df] outline-none transition hover:bg-[#e4f3ed] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-[#9eddd1] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none sm:min-h-64 sm:p-8 sm:text-3xl"
							>
								<span
									aria-hidden="true"
									className="text-[5.5rem] leading-none sm:text-[7rem]"
								>
									{choice.id === "yes" ? "👍" : "✋"}
								</span>
								{choice.label}
							</button>
						))}
					</div>
				)}
				<div className="flex flex-wrap items-center justify-center gap-3">
					<button
						type="button"
						disabled={!source || recording || locked}
						onClick={() => void media.play(source)}
						className={practiceAction}
					>
						<Volume2 aria-hidden="true" className="h-5 w-5" />
						ฟังโจทย์
					</button>
				</div>
				{!answered && (
					<PracticeHints
						category={question.category}
						source={source}
						answer={practiceAnswer ?? question.expectedAnswer}
						answerContent={
							question.interactionType === "image_choice" &&
							correctChoice && (
								<div className="w-60 max-w-full">
									<TrainingImageFrame
										size="choice"
										alt="ภาพเฉลย"
										imageSrc={correctChoice.imageSrc ?? correctChoice.imageUrl}
									/>
								</div>
							)
						}
						feature={feature?.text}
						initialSyllable={initial?.text}
						hintSources={[
							approvedPatientAudio(
								feature?.audioSrc ??
									patientAudioManifest?.assessmentHints?.[`${question.id}-1`],
							),
							approvedPatientAudio(
								initial?.audioSrc ??
									patientAudioManifest?.assessmentHints?.[`${question.id}-2`],
							),
						]}
						answerSource={approvedPatientAudio(
							question.answerAudioSrc ??
								patientAudioManifest?.assessmentAnswers?.[question.id],
						)}
						disabled={locked || recording}
						play={media.play}
						onCount={setHints}
					/>
				)}
				{!source && <p className="text-base text-[#829990]">ยังไม่มีเสียงโจทย์</p>}
				{error && (
					<p role="alert" className="text-lg text-amber-900">
						{error}
					</p>
				)}
			</div>
		</div>
	);
}
