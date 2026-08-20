"use client";

import { Check, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
	type ReactNode,
	type SVGProps,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { FeedbackBubble } from "@/components/ui/FeedbackBubble";
import { FeedbackOverlay } from "@/components/ui/FeedbackOverlay";
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
} from "../types/assessment.types";

/* ============================================================================
 * Local types
 * ==========================================================================*/

type MockRecordingUiState = "idle" | "recording" | "processing" | "recorded";
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

function getMockAnswerForQuestion(question: StandardAssessmentQuestion) {
	if (
		question.interactionType === "image_choice" ||
		question.interactionType === "yes_no_choice"
	) {
		return undefined;
	}

	return `mock ${question.interactionType} answer`;
}

function getDisplayPrompt(promptText: string) {
	return promptText.replace("คำถามจำลอง:", "").trim();
}

function getCategoryDisplay(question: StandardAssessmentQuestion) {
	if (question.interactionType === "voice_question") {
		return "พูดตอบ";
	}

	if (question.interactionType === "image_choice") {
		return "ชี้รูป";
	}

	if (question.interactionType === "yes_no_choice") {
		return "ตอบใช่/ไม่ใช่";
	}

	if (question.interactionType === "repeat_after") {
		return "พูดตาม";
	}

	if (question.interactionType === "name_image") {
		return "เรียกชื่อ";
	}

	return question.categoryLabel;
}

function getQuestionInstruction(interactionType: QuestionInteractionType) {
	if (interactionType === "voice_question") {
		return "พูดตอบ";
	}

	if (interactionType === "image_choice") {
		return "ชี้รูป";
	}

	if (interactionType === "yes_no_choice") {
		return "ตอบใช่/ไม่ใช่";
	}

	if (interactionType === "repeat_after") {
		return "พูดตาม";
	}

	if (interactionType === "name_image") {
		return "เรียกชื่อ";
	}

	return "คำถาม";
}

function getPromptSizeClass(promptText: string) {
	if (promptText.length > 30) {
		return "text-[clamp(1.3rem,5vw,2.4rem)]";
	}

	if (promptText.length > 18) {
		return "text-[clamp(1.5rem,5.6vw,2.95rem)]";
	}

	return "text-[clamp(2rem,7vw,3.75rem)]";
}

function getRepeatPromptSizeClass(promptText: string) {
	if (promptText.length > 26) {
		return "text-[clamp(1.9rem,5.6vw,3.25rem)] leading-[1.18]";
	}

	if (promptText.length > 16) {
		return "text-[clamp(2.2rem,6.4vw,4rem)] leading-[1.16]";
	}

	return "text-[clamp(2.8rem,7.6vw,4.5rem)] leading-[1.12]";
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

function getVoiceButtonText(recordingState: MockRecordingUiState) {
	if (recordingState === "recording") {
		return "กดอีกครั้งเพื่อหยุด";
	}

	if (recordingState === "processing") {
		return "กำลังบันทึก";
	}

	if (recordingState === "recorded") {
		return "บันทึกเสียงแล้ว";
	}

	return "กดเพื่อพูดตอบ";
}

/* ============================================================================
 * Audio helper (plays short UI cue sounds without interrupting playback state)
 * ==========================================================================*/

function playAudioWithNoStop(sound: string) {
	const cueAudio = new Audio(sound);
	cueAudio.volume = 0.7;
	cueAudio.play().catch(() => undefined);
}

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
		async (rawAudioSrc?: string, { withImageChoiceIntro = false } = {}) => {
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

			if (withImageChoiceIntro) {
				const introAudio = new Audio(
					"/training_sounds/Point_Image_Question.wav",
				);
				audioRef.current = introAudio;

				try {
					await new Promise<void>((resolve, reject) => {
						introAudio.onended = () => resolve();
						introAudio.onerror = () =>
							reject(new Error("Unable to play intro audio."));
						introAudio.play().catch(reject);
					});
				} catch (error) {
					console.warn(
						"Unable to play the image-choice intro clip, skipping to the main question audio.",
						error,
					);
				}
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
	onRecordingComplete: (blob: Blob) => void,
) {
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<BlobPart[]>([]);

	const stopHardware = useCallback(() => {
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state === "recording"
		) {
			mediaRecorderRef.current.stop();
			mediaRecorderRef.current.stream
				.getTracks()
				.forEach((track) => track.stop());
		}
	}, []);

	const cancelRecording = useCallback(() => {
		if (mediaRecorderRef.current) {
			mediaRecorderRef.current.onstop = null;
			stopHardware();
		}
	}, [stopHardware]);

	const stopRecording = useCallback(() => {
		playAudioWithNoStop("/audio/toggle_off.wav");
		stopHardware();
	}, [stopHardware]);

	const startRecording = useCallback(async () => {
		try {
			playAudioWithNoStop("/audio/toggle_on.wav");

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			audioChunksRef.current = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				const audioBlob = new Blob(audioChunksRef.current, {
					type: "audio/wav",
				});
				onRecordingComplete(audioBlob);
			};

			mediaRecorder.start();
			return true;
		} catch (error: unknown) {
			console.error("Error accessing microphone:", error);
			const message = error instanceof Error ? error.message : String(error);
			onError(
				"ไม่สามารถเข้าถึงไมโครโฟนได้ โปรดตรวจสอบการอนุญาตใช้งาน" +
					(message ? `: ${message}` : ""),
			);
			return false;
		}
	}, [onError, onRecordingComplete]);

	useEffect(() => stopHardware, [stopHardware]);

	return { startRecording, stopRecording, cancelRecording };
}

/* ============================================================================
 * Icon components (alphabetical)
 * ==========================================================================*/

function ChatCircleIcon(props: SVGProps<SVGSVGElement>) {
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
			<path d="M21 11.5a8.4 8.4 0 0 1-9 8.3 9.1 9.1 0 0 1-3.9-.9L3 20l1.4-4.2A8 8 0 0 1 3 11.5 8.6 8.6 0 0 1 12 3a8.6 8.6 0 0 1 9 8.5Z" />
			<path d="M8.5 11.5h.01" />
			<path d="M12 11.5h.01" />
			<path d="M15.5 11.5h.01" />
		</svg>
	);
}

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

function AudioWaves() {
	const waveHeights = [9, 20, 34, 50, 68, 50, 34, 20, 9];

	return (
		<>
			<div className="absolute left-[8%] top-1/2 hidden -translate-y-1/2 items-center gap-2 text-[#86D9D2]/75 xl:flex">
				{waveHeights.map((height, index) => (
					<span
						key={`l-wave-${index}`}
						className="w-2.5 rounded-full bg-current"
						style={{ height }}
					/>
				))}
			</div>
			<div className="absolute right-[8%] top-1/2 hidden -translate-y-1/2 items-center gap-2 text-[#86D9D2]/75 xl:flex">
				{waveHeights.map((height, index) => (
					<span
						key={`r-wave-${index}`}
						className="w-2.5 rounded-full bg-current"
						style={{ height }}
					/>
				))}
			</div>
		</>
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

function SessionPill({ children }: { children: ReactNode }) {
	return (
		<div className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-[#F2FBFB] px-4 text-sm font-bold text-[#12847D] ring-1 ring-[#CDEEEF] sm:min-h-14 sm:gap-3.5 sm:px-8 sm:text-xl">
			<ChatCircleIcon className="h-4 w-4 sm:h-7 sm:w-7" />
			<span>{children}</span>
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
	const instructionText = getQuestionInstruction(question.interactionType);
	const questionImageSrc = question.imageSrc ?? question.imageUrl;
	const isNamingImageQuestion = question.interactionType === "name_image";
	const isImageChoiceQuestion = question.interactionType === "image_choice";
	const isYesNoQuestion = question.interactionType === "yes_no_choice";
	const isRepeatQuestion = question.interactionType === "repeat_after";
	const showInstructionBadge =
		question.interactionType !== "voice_question" &&
		question.interactionType !== "image_choice" &&
		question.interactionType !== "yes_no_choice" &&
		question.interactionType !== "repeat_after" &&
		question.interactionType !== "name_image";

	const questionText = isRepeatQuestion ? "พูดตาม" : promptText;
	const hasImage = Boolean(questionImageSrc || isNamingImageQuestion);

	return (
		<article
			className={`flex min-h-0 w-full max-w-155 flex-col items-center gap-1.5 rounded-[18px] bg-white/96 px-3 py-2 text-center shadow-[0_18px_48px_rgba(17,103,99,0.12)] ring-1 ring-[#CDEEEF] sm:gap-5 sm:rounded-[34px] sm:px-7 sm:py-6 ${
				hasImage ? "justify-center" : "justify-center"
			} ${
				isNamingImageQuestion
					? "sm:h-[clamp(500px,58vh,570px)] sm:max-w-160"
					: isImageChoiceQuestion
						? "sm:h-[clamp(260px,34vh,320px)] sm:max-w-115"
						: isYesNoQuestion
							? "sm:h-[clamp(330px,42vh,390px)] sm:max-w-165"
							: "sm:h-[clamp(330px,42vh,390px)] sm:max-w-160"
			}`}
		>
			{showInstructionBadge ? (
				<div
					className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#F2FBFB] font-semibold text-[#12847D] ring-1 ring-[#CDEEEF] ${
						isNamingImageQuestion
							? "min-h-8 px-3 text-xs sm:min-h-9 sm:px-4 sm:text-base"
							: "mb-1 min-h-9 px-3 text-xs sm:mb-5 sm:min-h-10.5 sm:px-5 sm:text-lg"
					}`}
				>
					<ChatCircleIcon
						className={
							isNamingImageQuestion
								? "h-4 w-4 sm:h-5 sm:w-5"
								: "h-4 w-4 sm:h-6 sm:w-6"
						}
					/>
					<span>{instructionText}</span>
				</div>
			) : null}

			{hasImage ? (
				<div
					className={`flex min-h-0 min-w-0 flex-10 w-full items-center justify-center overflow-hidden **:max-h-full **:max-w-full ${
						isNamingImageQuestion
							? "sm:h-[clamp(240px,32vh,300px)] sm:w-[clamp(260px,34vh,340px)] rounded-[22px] bg-white/90 p-1.5 shadow-sm ring-[#CDEEEF] sm:rounded-[34px] sm:p-2"
							: "mb-1.5 sm:mb-5 h-[clamp(96px,20vh,184px)] w-[clamp(96px,20vh,184px)] rounded-[20px] bg-[#F4FCFC] shadow-inner ring-[#D7EFF0] sm:rounded-[28px]"
					}`}
				>
					<AssessmentImage
						src={questionImageSrc}
						alt={promptText}
						width={320}
						height={320}
						className={`h-full w-full object-contain ${
							isNamingImageQuestion ? "" : "p-2 sm:p-3"
						}`}
						fallbackClassName="flex h-full w-full items-center justify-center rounded-[24px] bg-[#F4FCFC] px-4 text-center text-sm font-semibold text-[#13756F]/60"
					/>
				</div>
			) : null}

			<div
				className={`flex w-full items-center justify-center ${hasImage ? "shrink-0" : "flex-1"}`}
			>
				<h1
					className={`max-w-full wrap-break-word text-center font-bold text-[#143839] ${
						isNamingImageQuestion
							? "text-[clamp(1.75rem,5vw,3.75rem)] leading-[1.1]"
							: isRepeatQuestion
								? getRepeatPromptSizeClass(questionText)
								: `leading-[1.1] ${getPromptSizeClass(questionText)}`
					}`}
				>
					{questionText}
				</h1>
			</div>
		</article>
	);
}
/* ============================================================================
 * Voice-answer controls
 * ==========================================================================*/

type VoiceControlsProps = {
	recordingState: MockRecordingUiState;
	showReplayFeedback: boolean;
	onMicrophoneToggle: () => void;
	onReplayPrompt: () => void;
};

function VoiceControls({
	recordingState,
	showReplayFeedback,
	onMicrophoneToggle,
	onReplayPrompt,
}: VoiceControlsProps) {
	const micButtonText = getVoiceButtonText(recordingState);

	return (
		<section className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-2 overflow-visible text-center sm:gap-5">
			<div className="relative flex h-[clamp(82px,18dvh,190px)] w-full shrink-0 items-center justify-center sm:h-[clamp(120px,20dvh,220px)]">
				<AudioWaves />
				<button
					type="button"
					onClick={onMicrophoneToggle}
					aria-label={micButtonText}
					title={micButtonText}
					className="relative flex h-[clamp(72px,14dvh,160px)] w-[clamp(72px,14dvh,160px)] shrink-0 items-center justify-center rounded-full outline-none transition hover:scale-[1.02] focus:ring-4 focus:ring-[#1FA89C]/25 active:scale-[0.98] lg:h-[clamp(130px,20dvh,240px)] lg:w-[clamp(130px,20dvh,240px)]"
				>
					<span
						aria-hidden="true"
						className={`absolute -inset-2.5 rounded-full border-2 border-[#BFEAE7] sm:-inset-5 ${
							recordingState === "recording" ? "animate-pulse" : ""
						}`}
					/>
					<span className="relative flex h-full w-full items-center justify-center rounded-full bg-[linear-gradient(180deg,#41C9BE_0%,#13958C_100%)] text-white shadow-[0_18px_42px_rgba(20,149,141,0.28)]">
						<MicrophoneIcon className="h-[54%] w-[54%]" />
					</span>
				</button>
			</div>

			<button
				type="button"
				onClick={onMicrophoneToggle}
				disabled={recordingState === "processing"}
				className={`inline-flex min-h-10 w-fit cursor-default items-center justify-center rounded-full px-0 text-sm font-bold text-[#0F756F] transition pointer-events-none focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98] disabled:cursor-not-allowed lg:mt-5 lg:cursor-pointer lg:pointer-events-auto lg:min-h-15 lg:max-w-none lg:min-w-65 lg:w-auto lg:px-8 lg:text-xl lg:shadow-[0_10px_28px_rgba(17,103,99,0.12)] lg:ring-1 max-[480px]:min-h-9 ${
					recordingState === "recording"
						? "lg:bg-[#FFF3F1] lg:text-[#D92D20] lg:ring-[#F8C9C4]"
						: "lg:bg-white lg:text-[#0F756F] lg:ring-[#CDEEEF] lg:hover:bg-[#F7FFFF]"
				}`}
			>
				{micButtonText}
			</button>

			<div className="relative">
				{showReplayFeedback ? (
					<p className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#123232] px-3 py-1 text-xs font-semibold text-white shadow-lg sm:-top-12 sm:px-5 sm:py-2 sm:text-base">
						กำลังเล่นโจทย์
					</p>
				) : null}

				<button
					type="button"
					onClick={onReplayPrompt}
					aria-label="ฟังโจทย์อีกครั้ง"
					className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-[#13756F] shadow-[0_10px_24px_rgba(17,103,99,0.11)] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF] focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98] sm:min-h-14 sm:gap-3 sm:px-7 sm:text-lg max-[480px]:min-h-8 max-[480px]:px-3 max-[480px]:text-xs"
				>
					<SpeakerIcon className="h-4 w-4 sm:h-6 sm:w-6" />
					ฟังโจทย์อีกครั้ง
				</button>
			</div>
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
	return (
		<section className="flex w-full max-w-220 flex-wrap items-center justify-center gap-2 sm:gap-3">
			{choices?.map((choice) => {
				const isSelected = selectedOptionId === choice.id;
				const isCorrectSelected = isSelected && feedbackState === "correct";
				const isWrongSelected = isSelected && feedbackState === "wrong";
				const choiceImageSrc = choice.imageSrc ?? choice.imageUrl;

				return (
					<button
						key={choice.id}
						type="button"
						aria-label={`เลือก${choice.label}`}
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
									alt={choice.label}
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

type ImageChoiceFeedbackOverlayProps = {
	expectedAnswer?: string;
	feedbackState: ChoiceFeedbackState;
	visible: boolean;
};

function ImageChoiceFeedbackOverlay({
	expectedAnswer,
	feedbackState,
	visible,
}: ImageChoiceFeedbackOverlayProps) {
	if (!visible || !feedbackState) {
		return null;
	}

	const isCorrect = feedbackState === "correct";

	return (
		<div
			className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#123232]/10 p-4"
			aria-live="polite"
		>
			<div
				className={`mx-auto w-full max-w-xl rounded-[22px] p-6 text-center shadow-[0_18px_40px_rgba(0,0,0,0.08)] sm:rounded-[28px] sm:p-8 ${
					isCorrect ? "bg-[#E9F9F0]" : "bg-[#FFF1F3]"
				}`}
			>
				<div
					className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white sm:h-20 sm:w-20 ${
						isCorrect ? "bg-[#1FA89C]" : "bg-[#F97066]"
					}`}
					aria-hidden="true"
				>
					{isCorrect ? (
						<Check className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={3} />
					) : (
						<X className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={3} />
					)}
				</div>
				<h3 className="mt-4 text-2xl font-bold leading-tight text-[#123232] sm:mt-5 sm:text-3xl">
					{isCorrect ? "ถูกต้อง! เก่งมากเลย" : "ยังไม่ถูกต้อง"}
				</h3>
				{isCorrect && expectedAnswer ? (
					<p className="mt-3 text-base font-bold text-[#2C6A4F] sm:text-lg">
						คำตอบที่ถูก: {expectedAnswer}
					</p>
				) : null}
				<div className="mt-5 inline-flex items-center justify-center rounded-full bg-white/65 px-5 py-2.5 text-sm font-bold text-[#123232] sm:mt-6 sm:px-6 sm:py-3 sm:text-base">
					กำลังบันทึกคำตอบ
				</div>
			</div>
		</div>
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
		<footer className="relative z-20 grid shrink-0 grid-cols-2 gap-2 pt-1 lg:absolute lg:bottom-6 lg:left-8 lg:right-8 lg:grid-cols-3 lg:items-center lg:pt-0">
			<div className="hidden lg:block" />
			<div className="flex justify-center lg:col-start-3 lg:justify-end">
				<button
					className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-[#13756F] shadow-[0_10px_24px_rgba(17,103,99,0.11)] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF] focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-14 sm:w-auto sm:min-w-42.5 sm:gap-3 sm:px-6 sm:text-lg max-[480px]:min-h-8 max-[480px]:text-[11px]"
					type="button"
					disabled={isSkipping}
					onClick={onSkip}
				>
					<SkipIcon className="h-4 w-4 sm:h-7 sm:w-7" />
					<span>{isSkipping ? "กำลังข้าม..." : "ข้ามข้อนี้"}</span>
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

export function AssessmentSessionClient() {
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
	const [feedbackMockAnswer, setFeedbackMockAnswer] = useState<string>();
	const [feedbackExpected, setFeedbackExpected] = useState<string | undefined>(
		undefined,
	);
	const [isSkipping, setIsSkipping] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());
	const [isLoading, setIsLoading] = useState(true);

	const submissionInFlightRef = useRef(false);
	const completedQuestionRef = useRef<string | null>(null);

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

		return playAudioSrc(currentQuestion.questionAudioSrc, {
			withImageChoiceIntro: isImageChoiceInteraction(
				currentQuestion.interactionType,
			),
		});
	}, [currentQuestion, playAudioSrc]);

  /* ---- milestone state ---- */
	const [passedCount, setPassedCount] = useState(0);
	const [positiveFeedbackMessage, setPositiveFeedbackMessage] = useState("");
	const [positiveFeedbackVisible, setPositiveFeedbackVisible] = useState(false);

	/* ---- milestone trigger helper ---- */
	function triggerPositiveFeedback(nextPassedCount: number) {
    console.log(nextPassedCount)
		const milestone = [5, 10, 15, 20, 25].includes(nextPassedCount)
			? nextPassedCount
			: null;

		if (!milestone) return false;

		let message = "เก่งมาก!";
		let sound = "/audio/Session_Mid.wav";

    switch (milestone) {
					case 5:
						message = "เก่งมาก! ทำครบ 5 ข้อแล้ว!";
						sound = "/audio/Session_5_Finished.wav";
						break;
					case 10:
						message = "เยี่ยมมาก! ทำครบ 10 ข้อแล้ว!";
						sound = "/audio/Session_10_Finished.wav";
						break;
					case 15:
						message = "ถึงครึ่งทางแล้ว! พยายามเข้านะคะ!";
						sound = "/audio/Session_Mid.wav";
						break;
					case 20:
						message = "สุดยอดเลย! ทำครบ 20 ข้อแล้ว!";
						sound = "/audio/Session_20_Finished.wav";
						break;
					case 25:
						message = "อีกนิดเดียวจะเสร็จแล้ว! สู้ๆ นะคะ!";
						sound = "/audio/Session_25_Finished.wav";
						break;
				}
		if (milestone === 5) {
			message = "เก่งมาก! ทำครบ 5 ข้อแล้ว!";
			sound = "/audio/Session_5_Finished.wav";
		} else if (milestone === 10) {
		}

		setPositiveFeedbackMessage(message);
		setPositiveFeedbackVisible(true);

		if (typeof window !== "undefined") {
			cleanupAudioRef();
			playAudioWithNoStop(sound);
		}

		window.setTimeout(() => setPositiveFeedbackVisible(false), 4500);

		return true;
	}

	/* ---- effects ---- */

	useEffect(() => {
		let isActive = true;

		async function loadSession() {
			const result = await getStandardAssessmentSession();

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
	}, []);

	useEffect(() => {
		if (!currentQuestion) {
			return;
		}

		cleanupAudioRef();

		if (!currentQuestion.questionAudioSrc) {
			return;
		}

		const timeoutId = window.setTimeout(
			() => void playCurrentQuestionAudio(),
			0,
		);

		return () => {
			window.clearTimeout(timeoutId);
			cleanupAudioRef();
		};
	}, [currentQuestion, cleanupAudioRef, playCurrentQuestionAudio]);

	function handleReplayPrompt() {
		if (recordingState === "recording") {
			muteMicrophone(true);
		}

		setShowReplayFeedback(true);
		void playCurrentQuestionAudio();

		window.setTimeout(() => {
			setShowReplayFeedback(false);
		}, 700);
	}

	/* ---- question navigation / persistence helpers ---- */

	function resetQuestionUiState() {
		setSelectedOptionId("");
		setRecordingState("idle");
		setShowReplayFeedback(false);
		setImageChoiceFeedbackState(null);
		setImageChoiceFeedbackVisible(false);
		setIsImageChoiceSaving(false);
		setFeedbackExpected(undefined);
		setFeedbackMockAnswer(undefined);
		setErrorMessage("");
		completedQuestionRef.current = null;
	}

	function goToNextQuestionOrResult() {
		if (!session) {
			return;
		}

		const isLastQuestion = currentQuestionIndex === session.totalQuestions - 1;

		if (isLastQuestion) {
			router.push("/patient/assessment/result");
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
			hintLevelUsed: 0,
			hintCountUsed: 0,
			responseTimeMs: Math.max(0, Date.now() - questionStartedAt),
		};
	}

	async function saveCurrentAnswer(answer: AssessmentAnswer) {
		const result = await saveStandardAssessmentAnswer(answer);

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
		setImageChoiceFeedbackState(choice.isCorrect ? "correct" : "wrong");
		setImageChoiceFeedbackVisible(true);
		setFeedbackExpected(
			choice.isCorrect ? currentQuestion.expectedAnswer : undefined,
		);

		const result = await saveCurrentAnswer({
			questionId: currentQuestion.id,
			answerType: "image_choice",
			selectedOptionId: choice.id,
			answerImageUrl: choice.imageSrc ?? choice.imageUrl ?? choice.id,
			isCorrect: choice.isCorrect,
			...getAnswerMetadata(),
		});

		if (!result.success) {
			submissionInFlightRef.current = false;
			setIsImageChoiceSaving(false);
			setImageChoiceFeedbackVisible(false);
			return;
		}

		completedQuestionRef.current = questionKey;

		// Inside handleImageChoiceSelect
		const nextPassedCount = passedCount + 1;
		setPassedCount(nextPassedCount);
		const showFeedback = triggerPositiveFeedback(nextPassedCount);

		window.setTimeout(() => {
			setImageChoiceFeedbackVisible(false);
			setIsImageChoiceSaving(false);
			submissionInFlightRef.current = false;

			if (showFeedback) {
				window.setTimeout(() => {
					goToNextQuestionOrResult();
				}, 3300);
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

	const isCorrect = result.data.isCorrect ?? false;

	setImageChoiceFeedbackState(isCorrect ? "correct" : "wrong");
	setImageChoiceFeedbackVisible(true);
	setFeedbackExpected(currentQuestion.expectedAnswer);

	// Increment submission count on every Yes/No answer
	const nextPassedCount = passedCount + 1;
	setPassedCount(nextPassedCount);
	const showFeedback = triggerPositiveFeedback(nextPassedCount);

	window.setTimeout(() => {
		setImageChoiceFeedbackVisible(false);
		setIsImageChoiceSaving(false);
		submissionInFlightRef.current = false;

		if (showFeedback) {
			window.setTimeout(() => {
				goToNextQuestionOrResult();
			}, 3300);
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
		window.setTimeout(() => {
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

	const micRecorder = useMicrophoneRecorder(setErrorMessage, (audioBlob) => {
		void processRealRecording(audioBlob);
	});

	async function handleMicrophoneToggle() {
		if (recordingState === "processing" || recordingState === "recorded") {
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

		const started = await micRecorder.startRecording();

		if (started) {
			setRecordingState("recording");
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
			const answer: AssessmentAnswer = {
				questionId: currentQuestionForRecording.id,
				answerType: "mock_audio",
				mockRecordingState: "recorded",
				mockAnswer: getMockAnswerForQuestion(currentQuestionForRecording),
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

			const isCorrect = result.data.isCorrect ?? false;

			setRecordingState("recorded");
			setFeedbackExpected(
				currentQuestionForRecording.expectedAnswer ?? undefined,
			);
			setFeedbackType(isCorrect ? "correct" : "wrong");
			setFeedbackVisible(true);

			const nextPassedCount = passedCount + 1;
			setPassedCount(nextPassedCount);
			const showFeedback = triggerPositiveFeedback(nextPassedCount);

			const delay = showFeedback ? 5000 : isCorrect ? 3000 : 2000;

			window.setTimeout(() => {
				setFeedbackVisible(false);
				setRecordingState("idle");
				submissionInFlightRef.current = false;
				goToNextQuestionOrResult();
			}, delay);
		} catch (error: unknown) {
			console.error("Upload error:", error);
			const message = error instanceof Error ? error.message : String(error);
			setErrorMessage(message || "เกิดข้อผิดพลาดในการส่งคำตอบ โปรดลองอีกครั้ง");
			setRecordingState("idle");
			submissionInFlightRef.current = false;
		}
	}

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
	const categoryLabel = getCategoryDisplay(currentQuestion);
	const promptText = getDisplayPrompt(currentQuestion.promptText);

	/* ---- render ---- */

	return (
		<main className="min-h-dvh overflow-y-auto bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] p-2 text-[#123232] sm:min-h-dvh sm:h-auto sm:overflow-y-auto sm:p-6">
			<section className="relative mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-375 flex-col min-w-0 overflow-visible rounded-[20px] bg-white/95 px-3 py-2.5 shadow-[0_26px_70px_rgba(17,103,99,0.15)] ring-1 ring-[#CDEEEF] sm:min-h-[calc(100dvh-3rem)] sm:rounded-[36px] sm:px-8 sm:py-6 lg:h-[calc(100dvh-3rem)] lg:min-h-0">
				<BackgroundDecorations />

				<header className="relative z-10 grid shrink-0 gap-1.5 sm:gap-4 lg:grid-cols-[180px_minmax(0,1fr)_180px] lg:items-start">
					<button
						className="inline-flex min-h-9 w-fit items-center justify-center rounded-full bg-white px-4 text-xs font-semibold text-[#13756F] shadow-[0_10px_24px_rgba(17,103,99,0.1)] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF] sm:min-h-13 sm:px-6 sm:text-base"
						onClick={() => router.replace("/patient/home")}
						type="button"
					>
						ออกจากแบบฝึก
					</button>

					<div className="text-center">
						<div className="mx-auto max-w-full sm:max-w-205">
							<SessionProgress percent={progressPercent} />
						</div>

						<p className="mt-1 text-sm font-bold text-[#183C3F] sm:mt-3 sm:text-xl">
							ข้อที่ {currentQuestion.order} จากทั้งหมด {session.totalQuestions} ข้อ
						</p>

						<div className="mt-1.5 flex justify-center sm:mt-3">
							<SessionPill>{categoryLabel}</SessionPill>
						</div>
					</div>

					<div className="hidden lg:block" />
				</header>

				{errorMessage ? (
					<div className="relative z-20 mx-auto mt-2 w-fit max-w-[92%] shrink-0 rounded-full bg-[#FEE2E2] px-3 py-1.5 text-center text-xs font-bold text-[#B91C1C] shadow-sm sm:px-6 sm:py-3 sm:text-lg">
						{errorMessage}
					</div>
				) : null}

				<div
					className={`relative z-10 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] items-stretch gap-2 py-1.5 sm:gap-7 sm:py-5 lg:grid-rows-1 lg:items-center lg:pb-18 ${
						isImageChoiceQuestion
							? "lg:grid-cols-[minmax(380px,0.8fr)_minmax(420px,1.2fr)]"
							: isYesNoQuestion
								? "lg:grid-cols-[minmax(380px,0.95fr)_minmax(420px,1.05fr)]"
								: "lg:grid-cols-[minmax(420px,0.94fr)_minmax(460px,1.06fr)]"
					}`}
				>
					<div className="flex min-h-0 min-w-0 justify-center overflow-visible">
						<QuestionCard question={currentQuestion} promptText={promptText} />
					</div>

					<div className="flex min-h-0 min-w-0 items-center justify-center overflow-visible">
						{isVoiceQuestion ? (
							<VoiceControls
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

				<BottomControls isSkipping={isSkipping} onSkip={handleSkipQuestion} />

				<FeedbackOverlay
					visible={feedbackVisible}
					type={feedbackType}
					mockAnswer={feedbackMockAnswer}
					expectedAnswer={feedbackExpected}
					onClose={() => setFeedbackVisible(false)}
				/>

				<ImageChoiceFeedbackOverlay
					expectedAnswer={currentQuestion.expectedAnswer}
					feedbackState={imageChoiceFeedbackState}
					visible={imageChoiceFeedbackVisible}
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