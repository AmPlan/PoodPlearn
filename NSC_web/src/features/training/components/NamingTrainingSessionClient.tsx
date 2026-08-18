"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	type SVGProps,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { FeedbackBubble } from "@/components/ui/FeedbackBubble";
import {
	getNamingSessionById,
	getNamingSessionSummary,
	getNamingSetById,
	submitNamingAnswer,
} from "../services/pn002NamingService";
import type {
	NamingHint,
	NamingQuestion,
	NamingSessionState,
	NamingSessionSummary,
	NamingSet,
} from "../types/pn002Naming.types";
import { TrainingImageFrame } from "./TrainingImageFrame";

// --- Types ---
type RecordingState = "idle" | "recording" | "processing" | "recorded";
type AnswerFeedbackState = "correct" | "wrong" | null;

type NamingTrainingSessionClientProps = {
	sessionId?: string;
	setId?: NamingSet["id"];
};

// --- Utilities ---
function resolveAudioUrl(audioSrc?: string) {
	if (!audioSrc) return undefined;
	if (/^(https?:)?\/\//i.test(audioSrc) || audioSrc.startsWith("data:"))
		return audioSrc;
	if (typeof window === "undefined") return audioSrc;
	return new URL(audioSrc, window.location.origin).toString();
}

function isSupportedAudioSource(audioSrc: string) {
	return /\.(wav|mp3|m4a|ogg|aac|webm)(?:[?#].*)?$/i.test(audioSrc.trim());
}

function getHintBadge(hint: NamingHint) {
	if (hint.type === "answer") return "เฉลย";
	if (hint.type === "feature") return "ลักษณะ";
	return "เสียงขึ้นต้น";
}

function getMicText(recordingState: RecordingState) {
	if (recordingState === "recording") return "กดอีกครั้งเพื่อหยุด";
	if (recordingState === "processing") return "กำลังบันทึก";
	if (recordingState === "recorded") return "บันทึกเสียงแล้ว";
	return "กดเพื่อพูดตอบ";
}

// --- Custom Hooks ---

/**
 * Handles playing audio from URLs or Blobs, managing the internal Audio instance and cleanup.
 */

function playAudioWithNoStop(sound: string) {
	const successAudio = new Audio(sound);
	successAudio.volume = 0.7;
	successAudio.play().catch(() => undefined);
}

function useAudioPlayer(onError: (msg: string) => void) {
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const cleanupAudioRef = useCallback(() => {
		if (!audioRef.current) return;
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
					return false;
				}

				const contentType = response.headers.get("content-type") ?? "";
				if (!/^audio\//i.test(contentType)) {
					onError("ไฟล์เสียงไม่ถูกต้อง โปรดลองอีกครั้ง");
					return false;
				}

				const audioBlob = await response.blob();
				const objectUrl = URL.createObjectURL(audioBlob);
				const audio = new Audio(objectUrl);
				audio.preload = "auto";
				audioRef.current = audio;

				audio.onerror = () => {
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
		async (rawAudioSrc?: string | null) => {
			if (!rawAudioSrc) return false;
			const resolvedAudioSrc = resolveAudioUrl(rawAudioSrc);

			if (!resolvedAudioSrc) {
				onError("ไม่สามารถโหลดไฟล์เสียงได้");
				return false;
			}

			if (!isSupportedAudioSource(resolvedAudioSrc)) {
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

			audio.onerror = () => onError("ไม่สามารถโหลดไฟล์เสียงได้ โปรดตรวจสอบแหล่งที่มา");

			try {
				await audio.play();
				return true;
			} catch (_) {
				return await playAudioFromBlob(resolvedAudioSrc);
			}
		},
		[onError, playAudioFromBlob],
	);

	return { playAudioSrc, cleanupAudioRef };
}

/**
 * Handles accessing the microphone and capturing audio chunks.
 */
function useMicrophoneRecorder(
	onError: (msg: string) => void,
  playAudioSrc: CallableFunction, 
  cleanupAudioRef: CallableFunction,
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
			mediaRecorderRef.current.onstop = null; // Prevent submission
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
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			audioChunksRef.current = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) audioChunksRef.current.push(event.data);
			};

			mediaRecorder.onstop = () => {
				const audioBlob = new Blob(audioChunksRef.current, {
					type: "audio/wav",
				});
				onRecordingComplete(audioBlob);
			};

			mediaRecorder.start();
			return true;
		} catch (error) {
			console.error("Error accessing microphone:", error);
			onError("ไม่สามารถเข้าถึงไมโครโฟนได้ โปรดตรวจสอบการอนุญาตใช้งาน");
			return false;
		}
	}, [onError, onRecordingComplete]);

	// Ensure hardware is released on unmount
	useEffect(() => {
		return stopHardware;
	}, [stopHardware]);

	return { startRecording, stopRecording, cancelRecording };
}

// --- Main Component ---
export function NamingTrainingSessionClient({
	sessionId,
	setId,
}: NamingTrainingSessionClientProps) {
	const router = useRouter();

	// Data State
	const [set, setSet] = useState<NamingSet | null>(null);
	const [session, setSession] = useState<NamingSessionState | null>(null);
	const [summary, setSummary] = useState<NamingSessionSummary | null>(null);

	// Progress & Questions State
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());
	const [skippedCount, setSkippedCount] = useState(0);
	const [passedCount, setPassedCount] = useState(0);
	const [correctCount, setCorrectCount] = useState(0);

	// Interactive State
	const [recordingState, setRecordingState] = useState<RecordingState>("idle");
	const [hintLevel, setHintLevel] = useState<0 | 1 | 2 | 3>(0);
	const [activeHint, setActiveHint] = useState<NamingHint>();
	const [showReplayFeedback, setShowReplayFeedback] = useState(false);
	const [typedAnswer, setTypedAnswer] = useState("");

	// Feedback & Network State
	const [positiveFeedbackMessage, setPositiveFeedbackMessage] = useState("");
	const [positiveFeedbackVisible, setPositiveFeedbackVisible] = useState(false);
	const [answerFeedback, setAnswerFeedback] =
		useState<AnswerFeedbackState>(null);
	const [answerFeedbackVisible, setAnswerFeedbackVisible] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	// Initial Data Fetch
	useEffect(() => {
		let isActive = true;

		async function loadSession() {
			if (!sessionId) {
				setErrorMessage("ไม่พบข้อมูล session หรือชุดแบบฝึก");
				setIsLoading(false);
				return;
			}

			const sessionResult = await getNamingSessionById(sessionId);
			if (!isActive) return;

			if (!sessionResult.success) {
				setErrorMessage(sessionResult.errorMessage);
				setIsLoading(false);
				return;
			}

			const setResult = await getNamingSetById(sessionResult.data.setId);
			if (!isActive) return;

			if (!setResult.success) {
				setErrorMessage(setResult.errorMessage);
				setIsLoading(false);
				return;
			}

			setSet(setResult.data);
			setSession(sessionResult.data);
			setQuestionStartedAt(Date.now());
			setIsLoading(false);
		}

		loadSession();
		return () => {
			isActive = false;
		};
	}, [sessionId, setId]);

	const currentQuestion = set?.questions[currentQuestionIndex];
	const progressPercent = set
		? ((currentQuestionIndex + 1) / set.totalQuestions) * 100
		: 0;
	const hintButtonText = useMemo(() => `คำใบ้ ${hintLevel}/3`, [hintLevel]);

	// Audio Logic
	const { playAudioSrc, cleanupAudioRef } = useAudioPlayer(setErrorMessage);

	const playCurrentQuestionAudio = useCallback(() => {
		return playAudioSrc("/training_sounds/Naming_Question.wav");
	}, [playAudioSrc]);

	useEffect(() => {
		if (!currentQuestion) return;
		cleanupAudioRef();
		const timeoutId = window.setTimeout(
			() => void playCurrentQuestionAudio(),
			0,
		);
		return () => {
			window.clearTimeout(timeoutId);
			cleanupAudioRef();
		};
	}, [
		currentQuestion?.id,
		currentQuestion?.questionAudioSrc,
		playCurrentQuestionAudio,
		cleanupAudioRef,
	]);

	// Recording Logic
	const { startRecording, stopRecording, cancelRecording } =
		useMicrophoneRecorder(setErrorMessage, playAudioSrc, cleanupAudioRef, async (audioBlob) => {
			await saveAnswer(
				"mock_audio",
				typedAnswer.trim() ? typedAnswer : undefined,
				audioBlob,
			);
		});

	async function handleMicrophoneToggle() {
		if (!currentQuestion || recordingState === "processing") return;

		if (recordingState === "recording") {
			setRecordingState("processing");
			stopRecording();
			return;
		}

		if (recordingState === "recorded") return;

		cleanupAudioRef(); // Pause any playing audio
		const started = await startRecording();
		if (started) setRecordingState("recording");
	}

	// Question Navigation & Interaction
	function triggerPositiveFeedback(nextPassedCount: number) {
		const milestone = [5, 10].includes(nextPassedCount)
			? nextPassedCount
			: null;

		if (!milestone) return false;

		let message = "เก่งมาก!";
		let sound = "/audio/Session_Mid.wav";
		if (milestone === 5) {
			message = "เก่งมาก! ทำครบ 5 ข้อแล้ว!";
			sound = "/audio/Session_5_Finished.wav";
		} else if (milestone === 10) {
			message = "เยี่ยมมาก! ทำครบ 10 ข้อแล้ว!";
			sound = "/audio/Session_10_Finished.wav";
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

	function resetQuestionState() {
		setRecordingState("idle");
		setHintLevel(0);
		setActiveHint(undefined);
		setShowReplayFeedback(false);
		setTypedAnswer("");
		setAnswerFeedback(null);
		setAnswerFeedbackVisible(false);
		setQuestionStartedAt(Date.now());
	}

	async function goToNextQuestion() {
		if (!set || !session || !currentQuestion) return;

		if (currentQuestionIndex === set.totalQuestions - 1) {
			const storedDailyPlanScheduleId =
				typeof window !== "undefined"
					? (window.sessionStorage.getItem("dailyPlanScheduleId") ?? undefined)
					: undefined;
			const result = await getNamingSessionSummary(
				session.sessionId,
				storedDailyPlanScheduleId,
			);
			if (typeof window !== "undefined")
				window.sessionStorage.removeItem("dailyPlanScheduleId");
			if (result.success) {
        cleanupAudioRef;
        playAudioSrc("/audio/Session_End.wav");
        setSummary(result.data);
      };
			return;
		}

		resetQuestionState();
		setCurrentQuestionIndex((index) => index + 1);
	}

	async function saveAnswer(
		answerType: "mock_audio" | "skipped",
		submittedAnswer?: string,
		voiceFile?: Blob,
	) {
		if (!session || !set || !currentQuestion || isSaving) return false;

		setIsSaving(true);
		const responseTimeMs = Math.max(0, Date.now() - questionStartedAt);
		const result = await submitNamingAnswer({
			sessionId: session.sessionId,
			questionId: currentQuestion.id,
			setId: set.id,
			answerType,
			answerText: submittedAnswer,
			skipped: answerType === "skipped",
			hintLevelUsed: hintLevel,
			responseTimeMs,
			voiceFile,
		});

		setIsSaving(false);

		if (!result.success) {
			setErrorMessage(result.errorMessage);
			return false;
		}

		const isCorrect = result.data?.isCorrect;

		if (answerType === "mock_audio") {
			setAnswerFeedback(isCorrect ? "correct" : "wrong");
			setAnswerFeedbackVisible(true);
			setRecordingState(isCorrect ? "recorded" : "idle");

			window.setTimeout(() => {
				setAnswerFeedbackVisible(false);
				if (isCorrect) {
					const nextPassedCount = passedCount + 1;
					setPassedCount(nextPassedCount);
					const nextCorrectCount = correctCount + 1;
					setCorrectCount(nextCorrectCount);

					const showFeedback = triggerPositiveFeedback(nextPassedCount);
					if (showFeedback) window.setTimeout(goToNextQuestion, 4500);
					else goToNextQuestion();
				}
			}, 1500);
		}

		return true;
	}

	function handleReplayPrompt() {
		if (recordingState === "recording") {
			cancelRecording();
			setRecordingState("idle");
		}
		setShowReplayFeedback(true);
		void playCurrentQuestionAudio();
		window.setTimeout(() => setShowReplayFeedback(false), 800);
	}

	function handleRequestHint() {
		if (!currentQuestion) return;
		if (recordingState === "recording") {
			cancelRecording();
			setRecordingState("idle");
		}

		const nextHintLevel = Math.min(3, hintLevel + 1) as 1 | 2 | 3;
		const nextHint =
			currentQuestion.hints.find((hint) => hint.level === nextHintLevel) ??
			currentQuestion.hints[currentQuestion.hints.length - 1];

		setHintLevel(nextHintLevel);
		setActiveHint(nextHint);
		void playAudioSrc(nextHint?.audioSrc);
	}

	async function handleSkipQuestion() {
		const isSaved = await saveAnswer("skipped");
		if (isSaved) {
			const nextPassedCount = passedCount + 1;
			setPassedCount(nextPassedCount);
			const hasFeedback = triggerPositiveFeedback(nextPassedCount);
			setSkippedCount((prev) => prev + 1);

			if (hasFeedback) window.setTimeout(goToNextQuestion, 4500);
			else goToNextQuestion();
		}
	}

	// --- Render Branches ---
	if (isLoading) return <LoadingView />;

	if (errorMessage || !set || !session || !currentQuestion) {
		return (
			<ErrorView
				errorMessage={errorMessage}
				onGoBack={() => router.push("/patient/home")}
			/>
		);
	}

	if (summary) {
		return (
			<SummaryView
				set={set}
				correctCount={correctCount}
				skippedCount={skippedCount}
			/>
		);
	}

	// Main UI
	return (
		<main className="min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] p-4 text-[#123232] sm:p-6">
			<section className="relative mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-375 flex-col overflow-hidden rounded-[36px] bg-white/95 px-5 py-5 shadow-[0_26px_70px_rgba(17,103,99,0.15)] ring-1 ring-[#CDEEEF] sm:min-h-[calc(100dvh-3rem)] sm:px-8 sm:py-6">
				<BackgroundDecorations />

				<header className="relative z-10 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_180px]">
					<button
						className="inline-flex min-h-13 w-fit items-center justify-center rounded-full bg-white px-6 text-base font-semibold text-[#13756F] shadow-[0_10px_24px_rgba(17,103,99,0.1)] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF]"
						onClick={() => router.replace("/patient/home")}
						type="button"
					>
						ออกจากแบบฝึก
					</button>

					<div className="text-center">
						<div className="mx-auto max-w-205">
							<div className="h-3 overflow-hidden rounded-full bg-[#E6EFF2] shadow-inner">
								<div
									className="h-full rounded-full bg-[linear-gradient(90deg,#189C94,#27B6AB)] transition-[width] duration-300"
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
						</div>
						<p className="mt-3 text-xl font-bold text-[#183C3F]">
							ข้อที่ {currentQuestionIndex + 1} จากทั้งหมด {set.totalQuestions} ข้อ
						</p>
						<p className="mx-auto mt-6 inline-flex min-h-9.5 items-center rounded-full bg-[#F2FBFB] px-5 text-base font-semibold text-[#12847D] ring-1 ring-[#CDEEEF]">
							หมวดสัตว์
						</p>
					</div>
					<div className="hidden lg:block" />
				</header>

				{errorMessage && (
					<div className="relative z-20 mx-auto mt-3 w-fit rounded-full bg-[#FEE2E2] px-6 py-3 text-lg font-bold text-[#B91C1C] shadow-sm">
						{errorMessage}
					</div>
				)}

				<div className="relative z-10 grid flex-1 items-center gap-7 py-5 lg:grid-cols-[minmax(420px,0.94fr)_minmax(460px,1.06fr)] lg:pb-23">
					<div className="flex min-h-0 justify-center">
						<QuestionPanel question={currentQuestion} />
					</div>

					<section className="flex min-h-0 flex-col items-center justify-center gap-5 text-center">
						<div className="relative flex h-[clamp(190px,34vh,270px)] w-full items-center justify-center">
							<AudioWaves />
							<button
								aria-label={getMicText(recordingState)}
								className="relative flex h-[clamp(156px,22vh,198px)] w-[clamp(156px,22vh,198px)] items-center justify-center rounded-full outline-none transition hover:scale-[1.02] focus:ring-4 focus:ring-[#1FA89C]/25 active:scale-[0.98]"
								onClick={handleMicrophoneToggle}
								title={getMicText(recordingState)}
								type="button"
							>
								<span
									className={`absolute -inset-7 rounded-full border-2 border-[#BFEAE7] ${recordingState === "recording" ? "animate-pulse" : ""}`}
								/>
								<span className="relative flex h-full w-full items-center justify-center rounded-full bg-[linear-gradient(180deg,#41C9BE_0%,#13958C_100%)] text-white shadow-[0_18px_42px_rgba(20,149,141,0.28)]">
									<MicrophoneIcon className="h-[54%] w-[54%]" />
								</span>
							</button>
						</div>

						<button
							className={`inline-flex min-h-15 min-w-65 items-center justify-center rounded-full px-8 text-xl font-bold shadow-[0_10px_28px_rgba(17,103,99,0.12)] ring-1 transition focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98] ${
								recordingState === "recording"
									? "bg-[#FFF3F1] text-[#D92D20] ring-[#F8C9C4]"
									: "bg-white text-[#0F756F] ring-[#CDEEEF] hover:bg-[#F7FFFF]"
							}`}
							onClick={handleMicrophoneToggle}
							type="button"
						>
							{getMicText(recordingState)}
						</button>

						<div className="relative">
							{showReplayFeedback && (
								<p className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#123232] px-5 py-2 text-base font-semibold text-white shadow-lg">
									กำลังเล่นโจทย์
								</p>
							)}
							<button
								className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full bg-white px-7 text-lg font-bold text-[#13756F] shadow-[0_10px_24px_rgba(17,103,99,0.11)] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF] focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98]"
								onClick={handleReplayPrompt}
								type="button"
							>
								<SpeakerIcon className="h-6 w-6" /> ฟังโจทย์อีกครั้ง
							</button>
						</div>
					</section>
				</div>

				<footer className="relative z-20 grid gap-3 lg:absolute lg:bottom-6 lg:left-8 lg:right-8 lg:grid-cols-3 lg:items-center">
					<div className="flex justify-center lg:justify-start">
						<button
							className="inline-flex min-h-[56px] min-w-[170px] items-center justify-center gap-3 rounded-full bg-white px-6 text-lg font-semibold text-[#13756F] shadow-[0_10px_24px_rgba(17,103,99,0.11)] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF] focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98]"
							onClick={handleRequestHint}
							type="button"
						>
							<LightbulbIcon className="h-7 w-7" /> {hintButtonText}
						</button>
					</div>

					<div className="flex justify-end lg:col-start-3">
						<button
							className="inline-flex min-h-[56px] min-w-[170px] items-center justify-center gap-3 rounded-full bg-white px-6 text-lg font-semibold text-[#13756F] shadow-[0_10px_24px_rgba(17,103,99,0.11)] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF] focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
							disabled={isSaving}
							onClick={handleSkipQuestion}
							type="button"
						>
							<SkipIcon className="h-7 w-7" /> ข้ามข้อนี้
						</button>
					</div>
				</footer>
				<FeedbackBubble
					message={positiveFeedbackMessage}
					isVisible={positiveFeedbackVisible}
				/>
			</section>

			<HintOverlay
				hint={activeHint}
				onClose={() => {
					cleanupAudioRef();
					setActiveHint(undefined);
				}}
			/>
			<NamingResultOverlay
				visible={answerFeedbackVisible}
				feedbackState={answerFeedback}
				correctAnswer={currentQuestion.answer}
				onClose={() => setAnswerFeedbackVisible(false)}
			/>
		</main>
	);
}

// --- Extracted UI Subcomponents ---

function LoadingView() {
	return (
		<main className="flex min-h-dvh items-center justify-center bg-[#EFFBFD] p-6">
			<p className="text-center text-3xl font-bold text-[#45686A]">
				กำลังโหลดแบบฝึก...
			</p>
		</main>
	);
}

function ErrorView({
	errorMessage,
	onGoBack,
}: {
	errorMessage: string;
	onGoBack: () => void;
}) {
	return (
		<main className="flex min-h-dvh items-center justify-center bg-[#EFFBFD] p-6">
			<div className="w-full max-w-[680px] rounded-[32px] bg-white px-7 py-9 text-center shadow-[0_18px_45px_rgba(24,112,108,0.08)] ring-1 ring-[#F3D0D0]">
				<p className="text-2xl font-bold text-[#B42318]">
					{errorMessage || "ไม่พบแบบฝึก"}
				</p>
				<button
					className="mt-6 rounded-full bg-[#1FA89C] px-7 py-4 text-xl font-bold text-white"
					onClick={onGoBack}
					type="button"
				>
					กลับหน้าหลัก
				</button>
			</div>
		</main>
	);
}

function SummaryView({
	set,
	correctCount,
	skippedCount,
}: {
	set: NamingSet;
	correctCount: number;
	skippedCount: number;
}) {
	return (
		<main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-5 py-6 text-[#123232] sm:px-8">
			<section className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-225 items-center justify-center">
				<article className="w-full rounded-[36px] bg-white px-7 py-9 text-center shadow-[0_26px_70px_rgba(24,112,108,0.13)] ring-1 ring-[#CDEEEF] sm:px-10">
					<p className="mx-auto inline-flex min-h-[42px] items-center rounded-full bg-[#F2FBFB] px-6 text-lg font-semibold text-[#12847D] ring-1 ring-[#CDEEEF]">
						หมวดสัตว์
					</p>
					<h1 className="mt-5 text-[2.4rem] font-bold leading-tight sm:text-[3rem]">
						ฝึกครบ {set.totalQuestions} ข้อแล้ว
					</h1>
					<p className="mt-4 text-2xl font-bold text-[#0F756F]">
						{correctCount >= 5
							? `คุณทำได้ดีมาก! ผ่านแล้ว ${correctCount} ข้อ`
							: "วันนี้คุณทำได้ดีมากเลยค่ะ"}
					</p>
					<div className="mt-7 grid gap-4 sm:grid-cols-3">
						<div className="rounded-[28px] bg-[#EAF9F8] px-5 py-6">
							<p className="text-4xl font-bold text-[#0F756F]">
								{set.totalQuestions}
							</p>
							<p className="mt-2 text-lg font-semibold text-[#45686A]">
								ข้อที่บันทึก
							</p>
						</div>
						<div className="rounded-[28px] bg-[#F6FEFF] px-5 py-6">
							<p className="text-4xl font-bold text-[#0F756F]">
								{correctCount}
							</p>
							<p className="mt-2 text-lg font-semibold text-[#45686A]">
								ข้อที่ผ่าน
							</p>
						</div>
						<div className="rounded-[28px] bg-[#FFF7E8] px-5 py-6">
							<p className="text-4xl font-bold text-[#9A6A13]">
								{skippedCount}
							</p>
							<p className="mt-2 text-lg font-semibold text-[#45686A]">
								ข้อที่ข้าม
							</p>
						</div>
					</div>
					<Link
						className="mx-auto mt-8 flex min-h-[68px] max-w-[420px] items-center justify-center rounded-[24px] bg-[#1FA89C] px-7 text-2xl font-bold text-white shadow-[0_16px_34px_rgba(31,168,156,0.24)] transition hover:bg-[#178F84]"
						href="/patient/home"
					>
						กลับหน้าหลัก
					</Link>
				</article>
				d
			</section>
		</main>
	);
}

function QuestionPanel({ question }: { question: NamingQuestion }) {
	return (
		<article className="flex h-full min-h-110 w-full max-w-155 flex-col items-center justify-center gap-5 rounded-[34px] bg-white/96 px-7 py-6 text-center shadow-[0_18px_48px_rgba(17,103,99,0.12)] ring-1 ring-[#CDEEEF]">
			<p className="inline-flex min-h-9.5 items-center justify-center rounded-full bg-[#F2FBFB] px-5 text-base font-semibold text-[#12847D] ring-1 ring-[#CDEEEF]">
				แบบฝึกเรียกชื่อภาพ
			</p>
			<TrainingImageFrame alt={question.answer} imageSrc={question.imageSrc} />
			<h1 className="max-w-full wrap-break-word text-center text-[clamp(2.25rem,4vw,3.75rem)] font-bold leading-[1.05] text-[#143839]">
				{question.promptText}
			</h1>
		</article>
	);
}

function HintOverlay({
	hint,
	onClose,
}: {
	hint?: NamingHint;
	onClose: () => void;
}) {
	if (!hint) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-[#123232]/10 p-4">
			<div className="w-full max-w-lg rounded-[30px] bg-[#FFF9E6] p-8 text-center shadow-[0_20px_48px_rgba(0,0,0,0.1)]">
				<span className="inline-flex min-h-10 items-center rounded-full bg-white px-5 text-lg font-bold text-[#735C0F]">
					{getHintBadge(hint)}
				</span>
				<h2 className="mt-5 text-3xl font-bold text-[#123232]">คำใบ้</h2>
				<p className="mt-4 text-2xl font-semibold leading-relaxed text-[#354D50]">
					{hint.text}
				</p>
				<button
					className="mt-7 inline-flex min-h-14 items-center justify-center rounded-full bg-[#F0E28A] px-9 text-lg font-bold text-[#274024] shadow-sm transition hover:bg-[#EADF7C] focus:outline-none focus:ring-4 focus:ring-[#D6C85B]/30 active:scale-[0.98]"
					onClick={onClose}
					type="button"
				>
					เข้าใจแล้ว
				</button>
			</div>
		</div>
	);
}

function NamingResultOverlay({
	visible,
	feedbackState,
	correctAnswer,
	onClose,
}: {
	visible: boolean;
	feedbackState: AnswerFeedbackState;
	correctAnswer?: string;
	onClose: () => void;
}) {
	if (!visible || !feedbackState) return null;
	const isCorrect = feedbackState === "correct";
	return (
		<div
			className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#123232]/10 p-4"
			aria-live="polite"
		>
			<div
				className={`mx-auto w-full max-w-xl rounded-[28px] p-8 text-center shadow-[0_18px_40px_rgba(0,0,0,0.08)] ${isCorrect ? "bg-[#E9F9F0]" : "bg-[#FFF1F3]"}`}
			>
				<div
					className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-5xl font-bold text-white ${isCorrect ? "bg-[#1FA89C]" : "bg-[#F97066]"}`}
					aria-hidden="true"
				>
					{isCorrect ? "✓" : "×"}
				</div>
				<h3 className="mt-5 text-3xl font-bold leading-tight text-[#123232]">
					{isCorrect ? "ถูกต้อง! เก่งมากเลย" : "ยังไม่ถูกต้อง"}
				</h3>
				{!isCorrect && correctAnswer ? (
					<p className="mt-3 text-lg font-bold text-[#B42318]">โปรดลองอีกครั้ง</p>
				) : null}
			</div>
		</div>
	);
}

function BackgroundDecorations() {
	return (
		<>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -bottom-20 left-0 h-44 w-[44%] rounded-tr-[100%] bg-[#D8F4F0]/80"
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -bottom-14 right-0 h-44 w-[52%] rounded-tl-[100%] bg-[#D8F4F0]/78"
			/>
		</>
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

// Icon Components...
function MicrophoneIcon(props: SVGProps<SVGSVGElement>) {
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
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			{...props}
		>
			<path d="M11 5 6 9H3v6h3l5 4V5Z" />
			<path d="M16 9.5a4 4 0 0 1 0 5" />
			<path d="M19 6.5a8 8 0 0 1 0 11" />
		</svg>
	);
}

function LightbulbIcon(props: SVGProps<SVGSVGElement>) {
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
			<path d="M9 18h6" />
			<path d="M10 22h4" />
			<path d="M12 2a7 7 0 0 0-4 12.7c.7.5 1 1.1 1 1.8V17h6v-.5c0-.7.3-1.3 1-1.8A7 7 0 0 0 12 2Z" />
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