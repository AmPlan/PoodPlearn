"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getAuthSession } from "@/features/auth/services/authSession";
import {
	findCatalogSet,
	isSetReady,
	NAMING_PROMPT_AUDIO,
} from "../data/namingCatalog";
import { useNamingMedia } from "../hooks/useNamingMedia";
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
	setId?: string;
	sessionId?: string;
	assignedSetId?: string;
	dailyPlanScheduleId?: string;
};
export function NamingTrainingSessionClient({
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
				if (!result) throw new Error("ไม่พบชุดแบบฝึกนี้ กรุณาเลือกจากคลังแบบฝึก");
				if (active) {
					setData(result);
					setLoaded(true);
				}
			} catch (error) {
				if (active) {
					setNotice(error instanceof Error ? error.message : "โหลดแบบฝึกไม่ได้");
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
					throw new Error("กรุณาเข้าสู่ระบบคนไข้ก่อนเริ่มชุดฝึกที่ได้รับจากระบบ");
				const result = await createNamingSession(
					data.backendSetId,
					auth.user.patientId,
					schedule,
				);
				if (!result.success) throw new Error(result.errorMessage);
				setActiveSession(result.data.sessionId);
			}
			setStarted(true);
		} catch (error) {
			setNotice(error instanceof Error ? error.message : "เริ่มแบบฝึกไม่ได้");
		} finally {
			setStarting(false);
			startLock.current = false;
		}
	}
	if (started && data)
		return (
			<NamingRound
				key={round}
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
			<div className="mx-auto max-w-3xl">
				<Link
					className={namingSecondary}
					href="/patient/training/naming/animals"
				>
					ย้อนกลับคลังแบบฝึก
				</Link>
				<section className="mt-6 rounded-3xl border border-[#c5e2dc] bg-white p-6 sm:p-10">
					{!loaded ? (
						<p role="status" className="text-xl">
							กำลังโหลดชุดฝึก…
						</p>
					) : (
						data && (
							<>
								<p className="text-lg font-bold text-[#118a82]">
									{data.backendSetId ? "ชุดฝึกจากระบบ" : "ฝึกเพิ่มเติมจากคลัง"}
								</p>
								<h1 className="mt-3 text-3xl font-bold">แบบฝึกเรียกชื่อภาพ</h1>
								<p className="mt-4 text-2xl font-semibold">
									{data.category} · ระดับ{data.levelName}
								</p>
								<p className="mt-2 text-xl">
									ชุด {data.number} · จำนวน {data.questions.length} ข้อ
								</p>
								<ol className="mt-6 list-decimal space-y-3 pl-7 text-xl leading-9">
									<li>ดูภาพ แล้วลองพูดชื่อสิ่งที่เห็น</li>
									<li>กดไมโครโฟนเพื่อบันทึก กดอีกครั้งเพื่อหยุด หรือพิมพ์คำตอบแทน</li>
									<li>นึกไม่ออก ขอคำใบ้ทีละขั้น แล้วดูเฉลยได้</li>
									<li>กดถัดไปเมื่อพร้อม หรือเลือกข้าม</li>
								</ol>
								<p className="mt-5 rounded-2xl bg-[#edf9f6] p-4 text-lg leading-8">
									{data.backendSetId
										? "ส่งคำตอบให้ระบบตรวจเมื่อกดส่งคำตอบ หากข้ามหรือดูเฉลยโดยไม่ส่ง ระบบยังไม่บันทึกข้อนั้น"
										: "ผลรอบนี้เก็บเฉพาะบนหน้านี้ ไม่ส่งเสียงและไม่บันทึกลงแผนฝึก เมื่อออกจากหน้าหรือรีเฟรชข้อมูลจะหาย"}
								</p>
								{!isSetReady(data) && (
									<p
										role="status"
										className="mt-4 text-xl font-semibold text-amber-800"
									>
										ชุดนี้ยังรอรูปภาพ จึงยังเริ่มฝึกไม่ได้
									</p>
								)}
								<button
									type="button"
									onClick={start}
									disabled={!isSetReady(data) || starting}
									className={`${namingButton} mt-7 w-full`}
								>
									{starting ? "กำลังเริ่มแบบฝึก…" : "เริ่มแบบฝึก"}
								</button>
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
	set,
	sessionId,
	schedule,
	onRepeat,
}: {
	set: NamingRunSet;
	sessionId?: string;
	schedule?: string;
	onRepeat: () => void;
}) {
	const [index, setIndex] = useState(0);
	const [hints, setHints] = useState(0);
	const [revealed, setRevealed] = useState(false);
	const [answer, setAnswer] = useState("");
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
		actionLock.current = false;
	}
	async function submit() {
		if (
			!sessionId ||
			!set.backendSetId ||
			!set.questionIds ||
			submitted ||
			recording ||
			(!media.blob && !answer.trim()) ||
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
				answerText: answer.trim(),
			});
			setSubmitted(true);
			setCorrect(result.correct);
			lastSaved.current = result;
		} catch {
			setError(
				"ส่งคำตอบไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง หรือเลือกข้าม โดยข้อนี้จะยังไม่บันทึกลงระบบ",
			);
		} finally {
			setBusy(false);
			actionLock.current = false;
		}
	}
	function next(skipped: boolean) {
		if (busy || recording || (imageFailed && !skipped) || !lock()) return;
		if (!skipped && !revealed && !submitted && !media.blob && !answer.trim()) {
			actionLock.current = false;
			return;
		}
		const response: RoundResponse = {
			questionId: question.id,
			skipped,
			hintsUsed: revealed ? 3 : hints,
			revealed,
			recorded: Boolean(media.blob),
			typed: Boolean(answer.trim()),
			submitted: Boolean(lastSaved.current),
			correct: lastSaved.current?.correct,
		};
		setResponses((previous) => [...previous, response]);
		media.reset();
		setHints(0);
		setRevealed(false);
		setAnswer("");
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
			setError("บันทึกการจบรอบไม่ได้ ผลด้านล่างยังเป็นผลจากรอบนี้ กรุณาลองอีกครั้ง");
		} finally {
			actionLock.current = false;
		}
	}
	if (finished)
		return (
			<main className={namingPage}>
				<section className="mx-auto max-w-3xl rounded-3xl border border-[#c5e2dc] bg-white p-6 sm:p-10">
					<p className="text-lg font-semibold text-[#118a82]">
						{set.category} · ระดับ{set.levelName} · ชุด {set.number}
					</p>
					<h1
						ref={heading}
						tabIndex={-1}
						className="mt-3 text-3xl font-bold outline-none"
					>
						ฝึกจบแล้ว ขอบคุณที่ตั้งใจฝึก
					</h1>
					<p className="mt-4 text-xl">
						ผลจากการฝึกรอบนี้ {stats.completed} จาก {set.questions.length} ข้อ
					</p>
					<dl className="my-7 grid grid-cols-2 gap-4">
						{[
							["ข้อที่ตอบ", stats.answered],
							["ข้าม", stats.skipped],
							["ใช้คำใบ้หรือเฉลย", stats.hinted],
							["ดูเฉลย", stats.revealed],
						].map(([label, value]) => (
							<div key={label} className="rounded-2xl bg-[#edf9f6] p-5">
								<dt className="text-lg">{label}</dt>
								<dd className="mt-2 text-3xl font-bold text-[#118a82]">
									{value} ข้อ
								</dd>
							</div>
						))}
					</dl>
					<p className="text-lg leading-8">
						{stats.evaluated
							? `ระบบส่งผลตรวจกลับ ${stats.evaluated} ข้อ ตอบถูก ${stats.correct} ข้อจากข้อที่มีผลตรวจ`
							: "ยังไม่มีผลประเมินความถูกต้องจากระบบ จึงไม่แสดงคะแนนการพูด"}
					</p>
					<p className="mt-3 text-lg leading-8">
						{sessionId
							? `ส่งคำตอบสำเร็จ ${stats.submitted}/${set.questions.length} ข้อ${stats.submitted < set.questions.length ? " · ยังไม่ยืนยันการจบแผน เพราะมีข้อที่ยังไม่ได้บันทึก" : ""}`
							: "รอบฝึกเพิ่มเติมนี้ไม่ได้บันทึกลงระบบหรือแผนฝึก"}
					</p>
					{sessionId && stats.submitted === set.questions.length && (
						<button
							disabled={completion === "saving" || completion === "saved"}
							onClick={finishOnServer}
							className={`${namingButton} mt-5 w-full`}
						>
							{completion === "saved"
								? "บันทึกจบรอบแล้ว"
								: completion === "saving"
									? "กำลังบันทึก…"
									: "บันทึกการจบรอบ"}
						</button>
					)}
					{error && (
						<p role="alert" className="mt-4 text-lg text-red-800">
							{error}
						</p>
					)}
					<details className="mt-6 rounded-2xl border border-[#c5e2dc] p-4">
						<summary className="cursor-pointer py-2 text-xl font-bold">
							ดูรายละเอียดรอบนี้
						</summary>
						<ol className="mt-4 space-y-3 text-lg">
							{responses.map((response, i) => (
								<li key={response.questionId}>
									{i + 1}. {set.questions[i].answer} —{" "}
									{response.skipped
										? "ข้าม"
										: response.recorded || response.typed
											? "ตอบแล้ว"
											: "ดูเฉลย"}
									{response.revealed ? " · ดูเฉลย" : ""}
									{response.correct === true
										? " · ระบบตรวจว่าถูก"
										: response.correct === false
											? " · ระบบตรวจว่ายังไม่ถูก"
											: " · ยังไม่มีผลตรวจ"}
								</li>
							))}
						</ol>
					</details>
					<div className="mt-7 grid gap-4 sm:grid-cols-2">
						<button onClick={onRepeat} className={namingButton}>
							ฝึกซ้ำ
						</button>
						<Link
							href="/patient/training/naming/animals"
							className={namingSecondary}
						>
							กลับหน้ารายการ
						</Link>
					</div>
				</section>
			</main>
		);

	return (
		<main className={namingPage}>
			<section className="mx-auto max-w-5xl rounded-3xl border border-[#c5e2dc] bg-white p-5 sm:p-8">
				<header>
					<Link
						href="/patient/training/naming/animals"
						className={namingSecondary}
					>
						ออกจากแบบฝึก
					</Link>
					<p className="mt-5 text-lg font-semibold text-[#526a66]">
						{set.category} · ระดับ{set.levelName} · ชุด {set.number}
					</p>
					<p className="mt-2 text-xl font-bold">
						ข้อ {index + 1} จาก {set.questions.length}
					</p>
					<progress
						aria-label="ความคืบหน้าการฝึก"
						max={set.questions.length}
						value={responses.length}
						className="mt-3 h-3 w-full accent-[#118a82]"
					/>
				</header>
				<h1
					ref={heading}
					tabIndex={-1}
					className="my-5 text-center text-3xl font-bold outline-none sm:text-4xl"
				>
					ภาพนี้คืออะไร
				</h1>
				<div className="grid items-start gap-6 md:grid-cols-2">
					<div className="flex flex-col items-center gap-4">
						<TrainingImageFrame
							key={question.id}
							alt={`ภาพโจทย์ข้อ ${index + 1}`}
							imageSrc={question.imageSrc}
							onImageError={() => setImageFailed(true)}
						/>
						{imageFailed && (
							<p role="alert" className="text-lg text-red-800">
								โหลดภาพไม่ได้ กรุณาเลือกข้าม หรือกลับมาใหม่ภายหลัง
							</p>
						)}
						<button
							onClick={() => void media.play(NAMING_PROMPT_AUDIO)}
							disabled={recording || busy}
							className={`${namingSecondary} w-full`}
						>
							ฟังโจทย์
						</button>
					</div>
					<div className="flex flex-col gap-4">
						<button
							disabled={
								busy ||
								submitted ||
								media.micState === "requesting" ||
								imageFailed
							}
							onClick={() => {
								setError("");
								void media.toggleRecording();
							}}
							className={`${namingButton} min-h-20 ${recording ? "bg-red-700 hover:bg-red-800" : ""}`}
						>
							{media.micState === "recording"
								? "หยุดบันทึกเสียง"
								: media.micState === "requesting"
									? "กำลังขอใช้ไมโครโฟน…"
									: media.micState === "recorded"
										? "บันทึกเสียงใหม่"
										: "กดเพื่อพูดตอบ"}
						</button>
						<p role="status" className="text-center text-lg leading-8">
							{media.micState === "recording"
								? "กำลังบันทึกเสียง · กดหยุดเมื่อพูดจบ (ไม่เกิน 1 นาที)"
								: media.blob
									? "บันทึกเสียงแล้ว"
									: "กดไมโครโฟนเมื่อพร้อม"}
						</p>
						<details
							key={question.id}
							className="rounded-2xl border border-[#c5e2dc] p-4"
						>
							<summary className="cursor-pointer py-2 text-lg font-semibold">
								พิมพ์คำตอบแทนการพูด
							</summary>
							<label className="mt-3 block text-lg" htmlFor="naming-answer">
								คำตอบของคุณ
							</label>
							<input
								id="naming-answer"
								value={answer}
								disabled={recording || busy || submitted || imageFailed}
								onChange={(event) => setAnswer(event.target.value)}
								autoComplete="off"
								className="mt-2 min-h-14 w-full rounded-xl border-2 border-[#b6d9d2] px-4 text-xl focus:outline-2 focus:outline-teal-700"
							/>
						</details>
						{sessionId && (
							<button
								disabled={
									busy ||
									recording ||
									submitted ||
									imageFailed ||
									(!media.blob && !answer.trim())
								}
								onClick={submit}
								className={namingButton}
							>
								{busy
									? "กำลังส่งคำตอบ…"
									: submitted
										? "ส่งคำตอบแล้ว"
										: "ส่งคำตอบให้ระบบตรวจ"}
							</button>
						)}
						{submitted && (
							<p role="status" className="rounded-2xl bg-[#edf9f6] p-4 text-xl">
								{correct === true
									? "ระบบตรวจว่าตอบถูก พร้อมไปข้อถัดไป"
									: correct === false
										? "ระบบตรวจว่ายังไม่ถูก ลองทบทวนคำใบ้หรือดูเฉลยก่อนข้อถัดไป"
										: "ส่งคำตอบแล้ว แต่ระบบยังไม่มีผลตรวจความถูกต้อง"}
							</p>
						)}
						{submitted && correct === false && (
							<button
								onClick={() => {
									media.reset();
									setAnswer("");
									setSubmitted(false);
									setCorrect(undefined);
									setError("");
								}}
								className={namingSecondary}
							>
								ลองตอบอีกครั้ง
							</button>
						)}
						{!sessionId && (
							<p className="text-base leading-7 text-[#526a66]">
								รอบฝึกเพิ่มเติม · ยังไม่มีการตรวจคะแนนการพูด
							</p>
						)}
						<div className="grid gap-3 sm:grid-cols-2">
							<button
								onClick={hint}
								disabled={
									recording || busy || hints >= 2 || revealed || imageFailed
								}
								className={namingSecondary}
							>
								คำใบ้ {hints}/2
							</button>
							<button
								onClick={() => {
									if (!lock()) return;
									media.stopAudio();
									setRevealed(true);
									actionLock.current = false;
								}}
								disabled={
									recording || busy || hints < 2 || revealed || imageFailed
								}
								className={namingSecondary}
							>
								เฉลย
							</button>
						</div>
						{hints < 2 && !revealed && (
							<p className="text-base text-[#526a66]">
								ขอคำใบ้ครบ 2 ขั้น แล้วเปิดเฉลยได้
							</p>
						)}
						<div aria-live="polite" aria-atomic="true">
							{revealed ? (
								<div className="rounded-2xl bg-[#e3f5ed] p-5 text-center">
									<p className="text-lg">เฉลย</p>
									<p className="mt-2 text-3xl font-bold text-[#118a82]">
										{question.answer}
									</p>
									{question.answerAudioSrc && (
										<button
											onClick={() => void media.play(question.answerAudioSrc)}
											disabled={recording || busy}
											className={`${namingSecondary} mt-4 w-full`}
										>
											ฟังเสียงเฉลย
										</button>
									)}
								</div>
							) : hints > 0 ? (
								<p className="rounded-2xl bg-[#f0f9f5] p-5 text-xl leading-9">
									{hints === 1 ? question.featureHint : question.initialHint}
								</p>
							) : null}
						</div>
					</div>
				</div>
				{error && (
					<p
						role="alert"
						className="mt-5 rounded-xl bg-red-50 p-4 text-lg text-red-800"
					>
						{error}
					</p>
				)}
				<div className="mt-7 grid gap-4 border-t border-[#d7e9e4] pt-5 sm:grid-cols-2">
					<button
						onClick={() => next(true)}
						disabled={busy || recording}
						className={namingSecondary}
					>
						ข้ามข้อนี้
					</button>
					<button
						onClick={() => next(false)}
						disabled={
							busy ||
							recording ||
							imageFailed ||
							(!revealed && !submitted && !media.blob && !answer.trim())
						}
						className={namingButton}
					>
						{index === set.questions.length - 1 ? "ดูสรุปผล" : "ข้อถัดไป"}
					</button>
				</div>
			</section>
		</main>
	);
}
