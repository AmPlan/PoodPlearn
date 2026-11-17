"use client";

import {
	ArrowLeft,
	Check,
	X,
	Square,
	LoaderCircle,
	Lightbulb,
} from "lucide-react";
import Image from "next/image";
import { approvedPatientAudio } from "@/features/training/data/patientAudioManifest";
import { useNamingMedia } from "@/features/training/hooks/useNamingMedia";
import { useRouter } from "next/navigation";
import {
	type SVGProps,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { AnswerResultOverlay } from "@/components/training/AnswerResultOverlay";

import { FeedbackBubble } from "@/components/ui/FeedbackBubble";
import {
	getStandardAssessmentSession,
	saveStandardAssessmentAnswer,
} from "../services/standardAssessmentService";
import type {
	AssessmentAnswer,
	QuestionChoice,
	QuestionInteractionType,
	StandardAssessmentQuestion,
	StandardAssessmentSession,
	AssessmentServiceResult,
	SavedAssessmentAnswer,
} from "../types/assessment.types";

/* ============================================================================
 * Local types
 * ==========================================================================*/

type MockRecordingUiState =
	| "idle"
	| "requesting"
	| "recording"
	| "processing"
	| "recorded";
type ChoiceFeedbackState = "correct" | "wrong" | null;

/* ============================================================================
 * Interaction-type predicates
 * ==========================================================================*/

function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

function isVoiceInteraction(interactionType: QuestionInteractionType) {
	return (
		interactionType === "voice_question" ||
		interactionType === "repeat_after" ||
		interactionType === "name_image"
	);
}

function isImageChoiceInteraction(interactionType: QuestionInteractionType) {
	return interactionType === "image_choice";
}

function isYesNoInteraction(interactionType: QuestionInteractionType) {
	return interactionType === "yes_no_choice";
}

/* ============================================================================
 * Question display / formatting helpers
 * ==========================================================================*/

function getDisplayPrompt(promptText: string) {
	return promptText.replace("คำถามจำลอง:", "").trim();
}

function resolveAudioUrl(audioSrc?: string) {
	if (!audioSrc) {
		return undefined;
	}

	if (/^(https?:)?\/\//i.test(audioSrc) || audioSrc.startsWith("data:")) {
		return audioSrc;
	}

	if (typeof window === "undefined") {
		return audioSrc;
	}

	return new URL(audioSrc, window.location.origin).toString();
}

function isSupportedAudioSource(audioSrc: string) {
	return /\.(wav|mp3|m4a|ogg|aac|webm)(?:[?#].*)?$/i.test(audioSrc.trim());
}

/* ============================================================================
 * Voice-recording UI text helpers
 * ==========================================================================*/

/* ============================================================================
 * Audio helper (plays short UI cue sounds without interrupting playback state)
 * ==========================================================================*/

/* ============================================================================
 * Reusable audio-player hook (question prompts / replays)
 * ==========================================================================*/

function useQuestionAudioPlayer(onError: (message: string) => void) {
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const cleanupAudioRef = useCallback(() => {
		if (!audioRef.current) {
			return;
		}

		audioRef.current.pause();

		if (audioRef.current.src) {
			audioRef.current.removeAttribute("src");
			audioRef.current.load();
		}

		audioRef.current = null;
	}, []);

	const playAudioFromBlob = useCallback(
		async (audioSrc: string) => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.currentTime = 0;
			}

			try {
				const response = await fetch(audioSrc, { cache: "no-store" });

				if (!response.ok) {
					onError("ไม่สามารถโหลดไฟล์เสียงได้ โปรดตรวจสอบแหล่งที่มา");
					console.error(
						"Audio fetch failed:",
						audioSrc,
						response.status,
						response.statusText,
					);
					return false;
				}

				const contentType = response.headers.get("content-type") ?? "";
				if (!/^audio\//i.test(contentType)) {
					onError("ไฟล์เสียงไม่ถูกต้อง โปรดลองอีกครั้ง");
					console.error("Unexpected audio content type:", contentType);
					return false;
				}

				const audioBlob = await response.blob();
				const objectUrl = URL.createObjectURL(audioBlob);
				const audio = new Audio(objectUrl);
				audio.preload = "auto";
				audioRef.current = audio;

				audio.onerror = () => {
					console.error(
						"Blob audio failed to load:",
						audioSrc,
						audio.error?.code,
						audio.error?.message,
					);
					onError("ไม่สามารถโหลดไฟล์เสียงได้ โปรดตรวจสอบแหล่งที่มา");
					URL.revokeObjectURL(objectUrl);
				};

				audio.onended = () => URL.revokeObjectURL(objectUrl);

				await audio.play();
				return true;
			} catch (error) {
				console.error("Blob fallback playback failed:", error);
				onError("ไม่สามารถเล่นไฟล์เสียงได้ โปรดลองอีกครั้ง");
				return false;
			}
		},
		[onError],
	);

	const playAudioSrc = useCallback(
		async (rawAudioSrc?: string) => {
			if (!rawAudioSrc) {
				return false;
			}

			const resolvedAudioSrc = resolveAudioUrl(rawAudioSrc);

			if (!resolvedAudioSrc) {
				onError("ไม่สามารถโหลดไฟล์เสียงได้");
				return false;
			}

			if (!isSupportedAudioSource(resolvedAudioSrc)) {
				console.warn("Unsupported audio source type:", resolvedAudioSrc);
				onError("ไฟล์เสียงไม่รองรับ โปรดตรวจสอบแหล่งที่มา");
				return false;
			}

			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.currentTime = 0;
			}

			const audio = new Audio(resolvedAudioSrc);
			audio.preload = "auto";
			audioRef.current = audio;

			audio.onerror = () => {
				console.error(
					"Audio failed to load:",
					resolvedAudioSrc,
					audio.error?.code,
					audio.error?.message,
				);
				onError("ไม่สามารถโหลดไฟล์เสียงได้ โปรดตรวจสอบแหล่งที่มา");
			};

			try {
				await audio.play();
				return true;
			} catch (error) {
				console.error("Error playing question audio:", error);
				return await playAudioFromBlob(resolvedAudioSrc);
			}
		},
		[onError, playAudioFromBlob],
	);

	return { playAudioSrc, cleanupAudioRef };
}

/* ============================================================================
 * Reusable microphone-recorder hook
 * ==========================================================================*/

function useMicrophoneRecorder(
	onError: (message: string) => void,
	onRecordingComplete: { current: ((blob: Blob) => void) | null },
) {
	const media = useNamingMedia(onError);
	const lastBlob = useRef<Blob | undefined>(undefined);
	useEffect(() => {
		if (media.blob && lastBlob.current !== media.blob) {
			lastBlob.current = media.blob;
			onRecordingComplete.current?.(media.blob);
		}
	}, [media.blob, onRecordingComplete]);
	return {
		startRecording: media.toggleRecording,
		stopRecording: () => {
			void media.toggleRecording();
		},
		cancelRecording: media.reset,
	};
}

/* ============================================================================
 * Icon components (alphabetical)
 * ==========================================================================*/

function MicrophoneIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<rect x="8" y="3" width="8" height="11" rx="4" />
			<path d="M5 11a7 7 0 0 0 14 0" />
			<path d="M12 18v3" />
			<path d="M8 21h8" />
		</svg>
	);
}

function SpeakerIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path d="M11 5 6 9H3v6h3l5 4V5Z" />
			<path d="M16 9.5a4 4 0 0 1 0 5" />
			<path d="M19 6.5a8 8 0 0 1 0 11" />
		</svg>
	);
}

function SkipIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			{...props}
		>
			<path d="m5 5 8 7-8 7V5Z" />
			<path d="M19 5v14" />
		</svg>
	);
}

/* ============================================================================
 * Shared / decorative UI primitives
 * ==========================================================================*/

type AssessmentImageProps = {
	alt: string;
	className: string;
	fallbackClassName: string;
	height: number;
	src?: string;
	width: number;
};

function AssessmentImage({
	alt,
	className,
	fallbackClassName,
	height,
	src,
	width,
}: AssessmentImageProps) {
	const [failedSrc, setFailedSrc] = useState<string>();

	if (!src || failedSrc === src) {
		return <div className={fallbackClassName}>ไม่มีรูปภาพ</div>;
	}

	return (
		<Image
			src={src}
			alt={alt}
			width={width}
			height={height}
			className={className}
			onError={() => setFailedSrc(src)}
		/>
	);
}

function BackgroundDecorations() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 z-0 overflow-clip"
		>
			<div className="absolute -bottom-20 left-0 h-44 w-[44%] rounded-tr-[100%] bg-[#D8F4F0]/80" />
			<div className="absolute -bottom-14 right-0 h-44 w-[52%] rounded-tl-[100%] bg-[#D8F4F0]/78" />
		</div>
	);
}

function SessionProgress({ percent }: { percent: number }) {
	const safePercent = Math.min(100, Math.max(0, percent));

	return (
		<div
			role="region"
			aria-label="ความคืบหน้า"
			className="mx-auto w-full max-w-full sm:max-w-205"
		>
			<div className="h-2 overflow-hidden rounded-full bg-[#E6EFF2] shadow-inner sm:h-3">
				<div
					className="h-full rounded-full bg-[linear-gradient(90deg,#189C94,#27B6AB)] transition-[width] duration-300"
					style={{ width: `${safePercent}%` }}
				/>
			</div>
		</div>
	);
}

/* ============================================================================
 * Question card
 * ==========================================================================*/

type QuestionCardProps = {
	question: StandardAssessmentQuestion;
	promptText: string;
};

function QuestionCard({ question, promptText }: QuestionCardProps) {
	const src = question.imageSrc ?? question.imageUrl;
	const naming = question.interactionType === "name_image";
	const text = naming
		? "ภาพนี้คืออะไร"
		: question.interactionType === "repeat_after"
			? "พูดตาม"
			: promptText;
	return (
		<article className="flex w-full flex-col items-center justify-center gap-4 text-center">
			{src || naming ? (
				<div className="h-[clamp(150px,27dvh,300px)] w-full max-w-lg rounded-3xl bg-white p-2">
					<AssessmentImage
						src={src}
						alt={`ภาพโจทย์ข้อ ${question.order}`}
						width={400}
						height={300}
						className="h-full w-full object-contain"
						fallbackClassName="flex h-full items-center justify-center rounded-2xl bg-[#edf9f6] text-lg text-[#526a66]"
					/>
				</div>
			) : null}
			<h1 className="max-w-2xl text-balance text-2xl font-bold leading-relaxed text-[#173d3f] sm:text-3xl">
				{text}
			</h1>
		</article>
	);
}

/* ============================================================================
 * Voice-answer controls
 * ==========================================================================*/

type VoiceControlsProps = {
	audioReady: boolean;
	canRecord: boolean;
	recordingState: MockRecordingUiState;
	showReplayFeedback: boolean;
	onMicrophoneToggle: () => void;
	onReplayPrompt: () => void;
};

function VoiceControls({
	audioReady,
	canRecord,
	recordingState,
	showReplayFeedback,
	onMicrophoneToggle,
	onReplayPrompt,
}: VoiceControlsProps) {
	const label = !canRecord
		? "รอเสียงโจทย์"
		: recordingState === "requesting"
			? "รอไมโครโฟน…"
			: recordingState === "recording"
				? "หยุด"
				: recordingState === "processing"
					? "กำลังส่ง…"
					: recordingState === "recorded"
						? "ส่งแล้ว"
						: "แตะเพื่อพูด";
	return (
		<section className="flex w-full flex-col items-center justify-center gap-4 text-center">
			<button
				type="button"
				onClick={onMicrophoneToggle}
				disabled={
					!canRecord ||
					recordingState === "requesting" ||
					recordingState === "processing" ||
					recordingState === "recorded"
				}
				aria-label={label}
				aria-pressed={recordingState === "recording"}
				className={`flex h-40 w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-full text-white shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-teal-300 focus-visible:ring-offset-4 disabled:opacity-60 sm:h-48 sm:w-48 ${recordingState === "recording" ? "bg-red-700" : "bg-[#118a82]"}`}
			>
				{recordingState === "recording" ? (
					<Square
						aria-hidden="true"
						className="h-16 w-16"
						fill="currentColor"
					/>
				) : recordingState === "requesting" ||
					recordingState === "processing" ? (
					<LoaderCircle aria-hidden="true" className="h-16 w-16 animate-spin" />
				) : recordingState === "recorded" ? (
					<Check aria-hidden="true" className="h-16 w-16" />
				) : (
					<MicrophoneIcon aria-hidden="true" className="h-20 w-20" />
				)}
				<span className="text-xl font-bold">{label}</span>
			</button>
			<p role="status" className="sr-only">
				{recordingState === "recording"
					? "กำลังบันทึกเสียง กดหยุดเมื่อพูดจบ"
					: showReplayFeedback
						? "กำลังเล่นโจทย์"
						: label}
			</p>
			<button
				type="button"
				onClick={onReplayPrompt}
				disabled={!audioReady || recordingState === "processing"}
				aria-label="ฟังโจทย์อีกครั้ง"
				className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[#b6d9d2] px-5 text-xl font-semibold text-[#176e66] focus-visible:outline-4 focus-visible:outline-teal-700"
			>
				<SpeakerIcon aria-hidden="true" className="h-7 w-7" />
				ฟังโจทย์
			</button>
			{!audioReady && (
				<p role="status" className="text-lg text-amber-800">
					ยังไม่มีเสียงโจทย์
				</p>
			)}
		</section>
	);
}

/* ============================================================================
 * Image-choice controls + feedback
 * ==========================================================================*/

type ImageChoiceControlsProps = {
	choices: QuestionChoice[] | undefined;
	selectedOptionId: string;
	feedbackState: ChoiceFeedbackState;
	isLocked: boolean;
	onSelect: (choice: QuestionChoice) => void;
};

function ImageChoiceControls({
	choices,
	selectedOptionId,
	feedbackState,
	isLocked,
	onSelect,
}: ImageChoiceControlsProps) {
	if (!choices?.length)
		return (
			<p
				role="status"
				className="rounded-2xl bg-amber-50 p-5 text-xl text-amber-900"
			>
				รอตัวเลือกภาพ · ข้ามเพื่อดูข้อถัดไปได้
			</p>
		);
	return (
		<section className="flex w-full max-w-220 flex-wrap items-center justify-center gap-2 sm:gap-3">
			{choices?.map((choice, choiceIndex) => {
				const isSelected = selectedOptionId === choice.id;
				const isCorrectSelected = isSelected && feedbackState === "correct";
				const isWrongSelected = isSelected && feedbackState === "wrong";
				const choiceImageSrc = choice.imageSrc ?? choice.imageUrl;

				return (
					<button
						key={choice.id}
						type="button"
						aria-label={`เลือกภาพตัวเลือก ${choiceIndex + 1}`}
						disabled={isLocked}
						onClick={() => onSelect(choice)}
						className={`relative flex h-[clamp(140px,30vh,300px)] w-[clamp(140px,40vw,240px)] cursor-pointer flex-col items-center justify-center rounded-[20px] px-3 text-center transition focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98] disabled:cursor-not-allowed sm:rounded-[28px] sm:px-5 ${
							isCorrectSelected
								? "bg-[#EAF9F8] shadow-[0_18px_36px_rgba(31,168,156,0.18)] ring-2 ring-[#1FA89C]"
								: isWrongSelected
									? "bg-[#FFF1F3] shadow-[0_18px_36px_rgba(217,45,32,0.12)] ring-2 ring-[#F97066]"
									: "bg-white shadow-[0_12px_28px_rgba(17,103,99,0.09)] ring-1 ring-[#D7EFF0] hover:bg-[#F7FFFF]"
						}`}
					>
						{isCorrectSelected || isWrongSelected ? (
							<span
								className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full font-bold shadow-sm sm:right-4 sm:top-4 sm:h-10 sm:w-10 ${
									isCorrectSelected
										? "bg-[#1FA89C] text-white"
										: "bg-[#F97066] text-white"
								}`}
								aria-hidden="true"
							>
								{isCorrectSelected ? (
									<Check className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} />
								) : (
									<X className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} />
								)}
							</span>
						) : null}

						{choiceImageSrc ? (
							<div className="flex h-[clamp(100px,24vh,220px)] w-full max-w-55 items-center justify-center overflow-hidden rounded-2xl bg-[#F8FEFF] sm:rounded-3xl">
								<AssessmentImage
									src={choiceImageSrc}
									alt={`ภาพตัวเลือก ${choiceIndex + 1}`}
									width={240}
									height={240}
									className="h-full w-full object-contain p-2"
									fallbackClassName="flex h-full w-full items-center justify-center rounded-2xl px-4 text-center text-sm font-semibold text-[#13756F]/60"
								/>
							</div>
						) : (
							<div className="flex h-[clamp(100px,24vh,220px)] w-full max-w-55 items-center justify-center rounded-2xl bg-[#F8FEFF] px-5 text-center text-base font-bold text-[#6B7B80] ring-1 ring-[#D7EFF0] sm:rounded-3xl sm:text-xl">
								ยังไม่มีรูป
							</div>
						)}
					</button>
				);
			})}
		</section>
	);
}

/* ============================================================================
 * Yes/No controls
 * ==========================================================================*/

type YesNoControlsProps = {
	choices: QuestionChoice[] | undefined;
	selectedOptionId: string;
	feedbackState: ChoiceFeedbackState;
	isLocked: boolean;
	onSelect: (choice: QuestionChoice) => void;
};

function YesNoControls({
	choices,
	selectedOptionId,
	feedbackState,
	isLocked,
	onSelect,
}: YesNoControlsProps) {
	return (
		<section className="flex w-full max-w-160 items-center justify-center gap-3 sm:gap-6">
			{choices?.map((choice) => {
				const isSelected = selectedOptionId === choice.id;
				const isCorrectSelected = isSelected && feedbackState === "correct";
				const isWrongSelected = isSelected && feedbackState === "wrong";

				return (
					<button
						key={choice.id}
						type="button"
						disabled={isLocked}
						onClick={() => onSelect(choice)}
						className={`flex h-[clamp(140px,28vh,260px)] min-w-30 max-w-70 flex-1 flex-col items-center justify-center rounded-[22px] px-4 text-lg font-bold transition focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98] sm:rounded-4xl sm:px-6 sm:text-3xl ${
							isCorrectSelected
								? "bg-[#EAF9F8] text-[#0F756F] shadow-[0_18px_36px_rgba(31,168,156,0.16)] ring-2 ring-[#1FA89C]"
								: isWrongSelected
									? "bg-[#FFF1F3] text-[#B42318] shadow-[0_18px_36px_rgba(217,45,32,0.12)] ring-2 ring-[#F97066]"
									: isSelected
										? "bg-[#F2FBFB] text-[#0F756F] shadow-[0_18px_36px_rgba(31,168,156,0.12)] ring-2 ring-[#86D9D2]"
										: "bg-white text-[#123232] shadow-[0_12px_28px_rgba(17,103,99,0.09)] ring-1 ring-[#D7EFF0] hover:bg-[#F7FFFF]"
						} disabled:cursor-not-allowed`}
					>
						<span className="mb-3 text-[2.6rem] leading-none sm:mb-5 sm:text-[4.2rem]">
							{choice.id === "yes" ? "✓" : "×"}
						</span>
						<span>{choice.label}</span>
					</button>
				);
			})}
		</section>
	);
}

/* ============================================================================
 * Bottom action bar (skip only)
 * ==========================================================================*/

type BottomControlsProps = {
	isSkipping: boolean;
	onSkip: () => void;
};

function BottomControls({ isSkipping, onSkip }: BottomControlsProps) {
	return (
		<footer className="relative z-20 ml-auto shrink-0">
			<div className="flex justify-end">
				<button
					className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-xl font-semibold text-[#13756F] ring-1 ring-[#CDEEEF] hover:bg-[#F7FFFF] focus-visible:outline-4 focus-visible:outline-teal-700 disabled:opacity-60"
					type="button"
					disabled={isSkipping}
					onClick={onSkip}
				>
					<SkipIcon aria-hidden="true" className="h-7 w-7" />
					<span>{isSkipping ? "กำลังข้าม…" : "ข้าม"}</span>
				</button>
			</div>
		</footer>
	);
}

/* ============================================================================
 * Loading / error states
 * ==========================================================================*/

function LoadingView() {
	return (
		<main className="flex h-dvh items-center justify-center overflow-hidden bg-[#EFFBFD] p-6">
			<p className="text-center text-xl font-bold text-[#45686A] sm:text-3xl">
				กำลังโหลดแบบทดสอบ...
			</p>
		</main>
	);
}

function ErrorView({ errorMessage }: { errorMessage: string }) {
	return (
		<main className="flex h-dvh items-center justify-center overflow-hidden bg-[#EFFBFD] p-4 sm:p-6">
			<div className="w-full max-w-170 rounded-3xl bg-white px-5 py-7 text-center shadow-[0_18px_45px_rgba(24,112,108,0.08)] ring-1 ring-[#F3D0D0] sm:rounded-4xl sm:px-7 sm:py-9">
				<p className="text-lg font-bold text-[#B42318] sm:text-2xl">
					{errorMessage || "ไม่พบแบบทดสอบ"}
				</p>
			</div>
		</main>
	);
}

/* ============================================================================
 * Main component
 * ==========================================================================*/

export function AssessmentSessionClient({
	previewSession,
}: {
	previewSession?: StandardAssessmentSession;
} = {}) {
	const preview =
		process.env.NODE_ENV === "development" && Boolean(previewSession);
	const router = useRouter();

	/* ---- state ---- */
	const [session, setSession] = useState<StandardAssessmentSession | null>(
		null,
	);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [selectedOptionId, setSelectedOptionId] = useState("");
	const [recordingState, setRecordingState] =
		useState<MockRecordingUiState>("idle");
	const [showReplayFeedback, setShowReplayFeedback] = useState(false);
	const [feedbackVisible, setFeedbackVisible] = useState(false);
	const [feedbackType, setFeedbackType] = useState<
		"correct" | "almost" | "wrong" | "skipped"
	>("correct");
	const [imageChoiceFeedbackState, setImageChoiceFeedbackState] =
		useState<ChoiceFeedbackState>(null);
	const [imageChoiceFeedbackVisible, setImageChoiceFeedbackVisible] =
		useState(false);
	const [isImageChoiceSaving, setIsImageChoiceSaving] = useState(false);
	const [feedbackExpected, setFeedbackExpected] = useState<string | undefined>(
		undefined,
	);
	const [isSkipping, setIsSkipping] = useState(false);
	const [hintCount, setHintCount] = useState(0);
	const [errorMessage, setErrorMessage] = useState("");
	const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());
	const [isLoading, setIsLoading] = useState(true);

	const submissionInFlightRef = useRef(false);
	const completedQuestionRef = useRef<string | null>(null);
	const recordingCompleteRef = useRef<((blob: Blob) => void) | null>(null);
	const micRecorder = useMicrophoneRecorder((message) => {
		setErrorMessage(message);
		setRecordingState("idle");
	}, recordingCompleteRef);
	const pendingTimers = useRef<Set<number>>(new Set());

	const schedule = useCallback((callback: () => void, delay: number) => {
		const timer = window.setTimeout(() => {
			pendingTimers.current.delete(timer);
			callback();
		}, delay);
		pendingTimers.current.add(timer);
		return timer;
	}, []);
	useEffect(() => {
		const timers = pendingTimers.current;
		return () => {
			timers.forEach((timer) => window.clearTimeout(timer));
			timers.clear();
		};
	}, []);

	const currentQuestion = session?.questions[currentQuestionIndex];

	const shuffledImageChoices = useMemo(() => {
		if (
			!currentQuestion?.choices ||
			currentQuestion.interactionType !== "image_choice"
		) {
			return currentQuestion?.choices;
		}
		return shuffleArray(currentQuestion.choices);
	}, [currentQuestion]);

	/* ---- audio ---- */
	const { playAudioSrc, cleanupAudioRef } =
		useQuestionAudioPlayer(setErrorMessage);

	const playCurrentQuestionAudio = useCallback(() => {
		if (!currentQuestion?.questionAudioSrc) {
			return Promise.resolve(false);
		}

		return playAudioSrc(approvedPatientAudio(currentQuestion.questionAudioSrc));
	}, [currentQuestion, playAudioSrc]);

	/* ---- milestone state ---- */
	const [passedCount, setPassedCount] = useState(0);
	const [positiveFeedbackMessage, setPositiveFeedbackMessage] = useState("");
	const [positiveFeedbackVisible, setPositiveFeedbackVisible] = useState(false);

	/* ---- milestone trigger helper ---- */
	function triggerPositiveFeedback(nextPassedCount: number) {
		if ([5, 10, 15, 20, 25].includes(nextPassedCount)) {
			setPositiveFeedbackMessage("เก่งมาก");
			setPositiveFeedbackVisible(true);
			schedule(() => setPositiveFeedbackVisible(false), 1500);
		}
		return false;
	}

	/* ---- effects ---- */

	useEffect(() => {
		let isActive = true;

		async function loadSession() {
			const result =
				preview && previewSession
					? { success: true as const, data: previewSession }
					: await getStandardAssessmentSession();

			if (!isActive) {
				return;
			}

			if (!result.success) {
				setErrorMessage(result.errorMessage);
				setIsLoading(false);
				return;
			}

			setSession(result.data);
			setQuestionStartedAt(Date.now());
			setIsLoading(false);
		}

		loadSession();

		return () => {
			isActive = false;
		};
	}, [preview, previewSession]);

	useEffect(() => {
		if (!currentQuestion) {
			return;
		}

		cleanupAudioRef();

		if (!approvedPatientAudio(currentQuestion.questionAudioSrc)) {
			return;
		}

		const timeoutId = schedule(() => void playCurrentQuestionAudio(), 0);

		return () => {
			window.clearTimeout(timeoutId);
			cleanupAudioRef();
		};
	}, [currentQuestion, cleanupAudioRef, playCurrentQuestionAudio, schedule]);

	function handleReplayPrompt() {
		if (recordingState === "recording" || recordingState === "requesting") {
			muteMicrophone(true);
		}

		setShowReplayFeedback(true);
		void playCurrentQuestionAudio();

		schedule(() => {
			setShowReplayFeedback(false);
		}, 700);
	}

	/* ---- question navigation / persistence helpers ---- */

	function resetQuestionUiState() {
		micRecorder.cancelRecording();
		setHintCount(0);
		setSelectedOptionId("");
		setRecordingState("idle");
		setShowReplayFeedback(false);
		setImageChoiceFeedbackState(null);
		setImageChoiceFeedbackVisible(false);
		setIsImageChoiceSaving(false);
		setFeedbackExpected(undefined);
		setErrorMessage("");
		completedQuestionRef.current = null;
	}

	function goToNextQuestionOrResult() {
		if (!session) {
			return;
		}

		const isLastQuestion = currentQuestionIndex === session.totalQuestions - 1;

		if (isLastQuestion) {
			router.push(
				preview ? "/dev/preview/result" : "/patient/assessment/result",
			);
			return;
		}

		resetQuestionUiState();
		setQuestionStartedAt(Date.now());
		setCurrentQuestionIndex((index) => index + 1);
	}

	function getAnswerMetadata(): Pick<
		AssessmentAnswer,
		"hintLevelUsed" | "hintCountUsed" | "responseTimeMs"
	> {
		return {
			hintLevelUsed: Math.min(3, hintCount) as 0 | 1 | 2 | 3,
			hintCountUsed: Math.min(3, hintCount) as 0 | 1 | 2 | 3,
			responseTimeMs: Math.max(0, Date.now() - questionStartedAt),
		};
	}

	async function saveCurrentAnswer(answer: AssessmentAnswer) {
		const result: AssessmentServiceResult<SavedAssessmentAnswer> = preview
			? {
					success: true,
					data: {
						answerId: `preview-${answer.questionId}`,
						questionId: answer.questionId,
						answerType: answer.answerType,
						skipped: answer.skipped,
						savedAt: new Date().toISOString(),
					},
				}
			: await saveStandardAssessmentAnswer(answer);

		if (!result.success) {
			setErrorMessage(result.errorMessage);
		}

		return result;
	}

	/* ---- choice-based answer handlers ---- */

	async function handleImageChoiceSelect(choice: QuestionChoice) {
		if (!session || !currentQuestion || !isImageChoiceQuestion) {
			return;
		}

		const questionKey = `${session.sessionId ?? "session"}:${currentQuestion.id}`;

		if (
			submissionInFlightRef.current ||
			completedQuestionRef.current === questionKey
		) {
			return;
		}

		submissionInFlightRef.current = true;
		setSelectedOptionId(choice.id);
		setErrorMessage("");
		setIsImageChoiceSaving(true);
		setImageChoiceFeedbackState(null);
		setImageChoiceFeedbackVisible(false);
		setFeedbackExpected(undefined);

		const result = await saveCurrentAnswer({
			questionId: currentQuestion.id,
			answerType: "image_choice",
			selectedOptionId: choice.id,
			answerImageUrl: choice.imageSrc ?? choice.imageUrl ?? choice.id,
			...getAnswerMetadata(),
		});

		if (!result.success) {
			submissionInFlightRef.current = false;
			setIsImageChoiceSaving(false);
			setImageChoiceFeedbackVisible(false);
			return;
		}

		completedQuestionRef.current = questionKey;
		const isCorrect = result.data.isCorrect;
		setImageChoiceFeedbackState(
			typeof isCorrect === "boolean" ? (isCorrect ? "correct" : "wrong") : null,
		);
		setImageChoiceFeedbackVisible(typeof isCorrect === "boolean");

		const nextPassedCount = passedCount + 1;
		setPassedCount(nextPassedCount);

		schedule(() => {
			setImageChoiceFeedbackVisible(false);
			setIsImageChoiceSaving(false);
			submissionInFlightRef.current = false;

			const showFeedback = triggerPositiveFeedback(nextPassedCount);

			if (showFeedback) {
				schedule(() => {
					goToNextQuestionOrResult();
				}, 4500);
			} else {
				goToNextQuestionOrResult();
			}
		}, 1200);
	}

	async function handleYesNoSelect(choice: QuestionChoice) {
		if (!session || !currentQuestion || !isYesNoQuestion) {
			return;
		}

		const questionKey = `${session.sessionId ?? "session"}:${currentQuestion.id}`;

		if (
			submissionInFlightRef.current ||
			completedQuestionRef.current === questionKey
		) {
			return;
		}

		submissionInFlightRef.current = true;
		setSelectedOptionId(choice.id);
		setErrorMessage("");
		setIsImageChoiceSaving(true);

		const result = await saveCurrentAnswer({
			questionId: currentQuestion.id,
			answerType: "yes_no_choice",
			selectedOptionId: choice.id,
			...getAnswerMetadata(),
		});

		if (!result.success) {
			submissionInFlightRef.current = false;
			setIsImageChoiceSaving(false);
			return;
		}

		completedQuestionRef.current = questionKey;

		const isCorrect = result.data.isCorrect;

		setImageChoiceFeedbackState(
			typeof isCorrect === "boolean" ? (isCorrect ? "correct" : "wrong") : null,
		);
		setImageChoiceFeedbackVisible(typeof isCorrect === "boolean");
		setFeedbackExpected(currentQuestion.expectedAnswer);

		const nextPassedCount = passedCount + 1;
		setPassedCount(nextPassedCount);

		schedule(() => {
			setImageChoiceFeedbackVisible(false);
			setIsImageChoiceSaving(false);
			submissionInFlightRef.current = false;

			const showFeedback = triggerPositiveFeedback(nextPassedCount);

			if (showFeedback) {
				schedule(() => {
					goToNextQuestionOrResult();
				}, 4500);
			} else {
				goToNextQuestionOrResult();
			}
		}, 1200);
	}
	/* ---- skip handler ---- */

	async function handleSkipQuestion() {
		if (
			!session ||
			!currentQuestion ||
			isSkipping ||
			recordingState === "processing"
		) {
			return;
		}

		const questionKey = `${session.sessionId ?? "session"}:${currentQuestion.id}`;

		if (
			submissionInFlightRef.current ||
			completedQuestionRef.current === questionKey
		) {
			return;
		}

		muteMicrophone(true);
		submissionInFlightRef.current = true;
		setIsSkipping(true);

		const skippedAnswer: AssessmentAnswer = {
			questionId: currentQuestion.id,
			answerType: "skipped",
			skipped: true,
			...getAnswerMetadata(),
		};

		const result = await saveCurrentAnswer(skippedAnswer);

		setIsSkipping(false);

		if (!result.success) {
			submissionInFlightRef.current = false;
			return;
		}

		completedQuestionRef.current = questionKey;
		submissionInFlightRef.current = false;

		// Increment submission count on skip
		const nextPassedCount = passedCount + 1;
		setPassedCount(nextPassedCount);
		const showFeedback = triggerPositiveFeedback(nextPassedCount);

		if (showFeedback) {
			schedule(() => {
				goToNextQuestionOrResult();
			}, 4500);
		} else {
			goToNextQuestionOrResult();
		}
	} /* ---- microphone recording handler ---- */

	function muteMicrophone(reset: boolean) {
		if (reset) {
			setRecordingState("idle");
			micRecorder.cancelRecording();
		} else {
			micRecorder.stopRecording();
		}
	}

	async function handleMicrophoneToggle() {
		if (
			currentQuestion?.interactionType === "repeat_after" &&
			!approvedPatientAudio(currentQuestion.questionAudioSrc)
		)
			return;
		if (
			recordingState === "requesting" ||
			recordingState === "processing" ||
			recordingState === "recorded"
		) {
			return;
		}

		// STOP RECORDING
		if (recordingState === "recording") {
			setRecordingState("processing");
			micRecorder.stopRecording();
			return;
		}

		if (submissionInFlightRef.current) {
			return;
		}

		// START RECORDING
		cleanupAudioRef();

		setRecordingState("requesting");
		const started = await micRecorder.startRecording();

		if (started) {
			setRecordingState("recording");
		} else {
			setRecordingState("idle");
		}
	}

	async function processRealRecording(audioBlob: Blob) {
		const currentQuestionForRecording =
			session?.questions[currentQuestionIndex];
		if (!currentQuestionForRecording || !session) return;

		const questionKey = `${session.sessionId ?? "session"}:${currentQuestionForRecording.id}`;

		if (
			submissionInFlightRef.current ||
			completedQuestionRef.current === questionKey
		) {
			return;
		}

		submissionInFlightRef.current = true;

		try {
			setRecordingState("processing");
			const answer: AssessmentAnswer = {
				questionId: currentQuestionForRecording.id,
				answerType: "mock_audio",
				mockRecordingState: "recorded",
				voiceFile: audioBlob,
				...getAnswerMetadata(),
			};

			const result = await saveCurrentAnswer(answer);

			if (!result.success) {
				setRecordingState("idle");
				submissionInFlightRef.current = false;
				return;
			}

			completedQuestionRef.current = questionKey;

			const isCorrect = result.data.isCorrect;

			setRecordingState("recorded");
			setFeedbackExpected(
				currentQuestionForRecording.expectedAnswer ?? undefined,
			);
			setFeedbackType(isCorrect ? "correct" : "wrong");
			setFeedbackVisible(typeof isCorrect === "boolean");

			const nextPassedCount = passedCount + 1;
			setPassedCount(nextPassedCount);

			const popupDelay = isCorrect ? 3000 : 2000;

			schedule(() => {
				setFeedbackVisible(false);
				setRecordingState("idle");
				submissionInFlightRef.current = false;

				const showFeedback = triggerPositiveFeedback(nextPassedCount);

				if (showFeedback) {
					schedule(() => {
						goToNextQuestionOrResult();
					}, 4500);
				} else {
					goToNextQuestionOrResult();
				}
			}, popupDelay);
		} catch (error: unknown) {
			console.error("Upload error:", error);
			const message = error instanceof Error ? error.message : String(error);
			setErrorMessage(message || "เกิดข้อผิดพลาดในการส่งคำตอบ โปรดลองอีกครั้ง");
			setRecordingState("idle");
			submissionInFlightRef.current = false;
		}
	}

	useEffect(() => {
		recordingCompleteRef.current = (audioBlob) => {
			void processRealRecording(audioBlob);
		};
	});

	/* ---- early returns: loading / error / no-session states ---- */

	if (isLoading) {
		return <LoadingView />;
	}

	if (errorMessage && !session) {
		return <ErrorView errorMessage={errorMessage} />;
	}

	if (!session || !currentQuestion) {
		return null;
	}

	/* ---- derived render values ---- */

	const progressPercent =
		(currentQuestion.order / session.totalQuestions) * 100;
	const isVoiceQuestion = isVoiceInteraction(currentQuestion.interactionType);
	const isImageChoiceQuestion = isImageChoiceInteraction(
		currentQuestion.interactionType,
	);
	const isYesNoQuestion = isYesNoInteraction(currentQuestion.interactionType);

	const promptText = getDisplayPrompt(currentQuestion.promptText);
	const availableHints = (currentQuestion.hints ?? []).filter(
		(hint) => hint.type !== "answer",
	);

	/* ---- render ---- */

	return (
		<main className="min-h-dvh overflow-y-auto bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] p-2 text-[#123232] sm:min-h-dvh sm:h-auto sm:overflow-y-auto sm:p-6">
			<section className="relative mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-375 flex-col min-w-0 overflow-visible rounded-[20px] bg-white/95 px-3 py-2.5 shadow-[0_26px_70px_rgba(17,103,99,0.15)] ring-1 ring-[#CDEEEF] sm:min-h-[calc(100dvh-3rem)] sm:rounded-[36px] sm:px-8 sm:py-6 ">
				<BackgroundDecorations />

				<header className="relative z-10 grid shrink-0 gap-1.5 sm:gap-4 lg:grid-cols-[180px_minmax(0,1fr)_180px] lg:items-start">
					<button
						className="inline-flex min-h-14 w-fit items-center justify-center gap-2 rounded-2xl border border-[#CDEEEF] bg-white px-5 text-xl font-semibold text-[#13756F] focus-visible:outline-4 focus-visible:outline-teal-700"
						onClick={() =>
							router.replace(preview ? "/dev/preview/new" : "/patient/home")
						}
						type="button"
					>
						<ArrowLeft aria-hidden="true" className="h-7 w-7" />
						กลับ
					</button>

					<div className="text-center">
						<div className="mx-auto max-w-full sm:max-w-205">
							<SessionProgress percent={progressPercent} />
						</div>

						<p className="mt-1 text-sm font-bold text-[#183C3F] sm:mt-3 sm:text-xl">
							ข้อที่ {currentQuestion.order} จากทั้งหมด {session.totalQuestions} ข้อ
						</p>
					</div>

					<div className="hidden lg:block" />
				</header>

				{errorMessage ? (
					<div className="relative z-20 mx-auto mt-2 w-fit max-w-[92%] shrink-0 rounded-full bg-[#FEE2E2] px-3 py-1.5 text-center text-xs font-bold text-[#B91C1C] shadow-sm sm:px-6 sm:py-3 sm:text-lg">
						{errorMessage}
					</div>
				) : null}

				<div
					className={`relative z-10 flex flex-1 flex-col items-center justify-center gap-5 py-4 ${isVoiceQuestion ? "" : "lg:gap-8"}`}
				>
					<div className="flex min-h-0 min-w-0 justify-center overflow-visible">
						<QuestionCard question={currentQuestion} promptText={promptText} />
					</div>

					<div className="flex min-h-0 min-w-0 w-full items-center justify-center overflow-visible">
						{isVoiceQuestion ? (
							<VoiceControls
								audioReady={Boolean(
									approvedPatientAudio(currentQuestion.questionAudioSrc),
								)}
								canRecord={
									currentQuestion.interactionType !== "repeat_after" ||
									Boolean(
										approvedPatientAudio(currentQuestion.questionAudioSrc),
									)
								}
								recordingState={recordingState}
								showReplayFeedback={showReplayFeedback}
								onMicrophoneToggle={handleMicrophoneToggle}
								onReplayPrompt={handleReplayPrompt}
							/>
						) : null}
						{isImageChoiceQuestion ? (
							<ImageChoiceControls
								choices={shuffledImageChoices}
								feedbackState={imageChoiceFeedbackState}
								isLocked={isImageChoiceSaving}
								selectedOptionId={selectedOptionId}
								onSelect={handleImageChoiceSelect}
							/>
						) : null}
						{isYesNoQuestion ? (
							<YesNoControls
								choices={currentQuestion.choices}
								feedbackState={imageChoiceFeedbackState}
								isLocked={isImageChoiceSaving}
								selectedOptionId={selectedOptionId}
								onSelect={handleYesNoSelect}
							/>
						) : null}
					</div>
				</div>

				{hintCount > 0 && (
					<p
						role="status"
						className="relative z-10 mx-auto mb-4 max-w-xl rounded-2xl bg-[#edf9f6] p-4 text-center text-xl"
					>
						{availableHints[hintCount - 1]?.text}
					</p>
				)}
				<div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
					{availableHints.length > 0 && (
						<button
							type="button"
							disabled={
								hintCount >= availableHints.length ||
								recordingState !== "idle" ||
								isSkipping ||
								isImageChoiceSaving
							}
							onClick={() => {
								if (submissionInFlightRef.current) return;
								cleanupAudioRef();
								setHintCount((count) =>
									Math.min(availableHints.length, count + 1),
								);
							}}
							className="inline-flex min-h-14 items-center gap-2 rounded-2xl border-2 border-[#b6d9d2] px-5 text-xl font-bold text-[#176e66] disabled:opacity-50 focus-visible:outline-4 focus-visible:outline-teal-700"
						>
							<Lightbulb aria-hidden="true" className="h-7 w-7" />
							คำใบ้
						</button>
					)}
					<BottomControls isSkipping={isSkipping} onSkip={handleSkipQuestion} />
				</div>

				<AnswerResultOverlay
					visible={feedbackVisible}
					feedbackState={
						feedbackType === "correct"
							? "correct"
							: feedbackType === "wrong"
								? "wrong"
								: null
					}
					correctAnswer={feedbackExpected}
					onClose={() => setFeedbackVisible(false)}
				/>

				<AnswerResultOverlay
					visible={imageChoiceFeedbackVisible}
					feedbackState={imageChoiceFeedbackState}
					correctAnswer={currentQuestion.expectedAnswer}
					onClose={() => setImageChoiceFeedbackVisible(false)}
				/>
				<FeedbackBubble message="" isVisible={false} />
			</section>
			<FeedbackBubble
				message={positiveFeedbackMessage}
				isVisible={positiveFeedbackVisible}
			/>
		</main>
	);
}
