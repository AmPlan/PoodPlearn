"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	chooseEncouragement,
	nextUnanswered,
	type PracticeEntry,
} from "../services/practiceFlow";
import { patientAudioManifest } from "../data/patientAudioManifest";

export type PracticeCue = {
	kind: "correct" | "wrong" | "received" | "milestone" | "remaining";
	text: string;
	audioSrc?: string;
	remainingQuestions?: number[];
};

export function usePracticeFlow<T>(
	total: number,
	{ perQuestionFeedback = true }: { perQuestionFeedback?: boolean } = {},
) {
	const [index, setIndex] = useState(0);
	const [revision, setRevision] = useState(0);
	const [entries, setEntries] = useState<PracticeEntry<T>[]>(() =>
		Array.from({ length: total }, () => ({ status: "pending" })),
	);
	const [cue, setCue] = useState<PracticeCue | null>(null);
	const [finished, setFinished] = useState(false);
	const entriesRef = useRef(entries);
	const currentRef = useRef(0);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const transitioning = useRef(false);
	const lastNavigation = useRef(0);
	const previousMessage = useRef<string | undefined>(undefined);
	const pendingStep = useRef<(() => void) | null>(null);
	const milestones = useRef(new Set<number>());
	const clearTimer = useCallback(() => {
		if (timer.current) clearTimeout(timer.current);
		timer.current = null;
	}, []);
	useEffect(() => clearTimer, [clearTimer]);

	function move(target: number) {
		currentRef.current = target;
		setIndex(target);
		setRevision((value) => value + 1);
	}
	function advance() {
		clearTimer();
		pendingStep.current = null;
		setCue(null);
		transitioning.current = false;
		const target = nextUnanswered(entriesRef.current, currentRef.current);
		if (target === null) setFinished(true);
		else if (target <= currentRef.current) {
			// At the end of a pass, explain the return instead of silently wrapping.
			transitioning.current = true;
			const remainingQuestions = entriesRef.current.flatMap((entry, i) =>
				entry.status === "answered" ? [] : [i + 1],
			);
			const audioSrc =
				patientAudioManifest.remainingQuestions[String(target + 1)];
			setCue({
				kind: "remaining",
				text: `กลับมาทำข้อ ${target + 1} กันนะคะ`,
				remainingQuestions,
				audioSrc,
			});
			const resume = () => {
				clearTimer();
				pendingStep.current = null;
				setCue(null);
				transitioning.current = false;
				move(target);
			};
			pendingStep.current = resume;
			timer.current = setTimeout(resume, audioSrc ? 20000 : 4000);
		} else move(target);
	}
	function goTo(target: number) {
		if (
			transitioning.current ||
			target < 0 ||
			target >= total ||
			Date.now() - lastNavigation.current < 500
		)
			return;
		lastNavigation.current = Date.now();
		clearTimer();
		setCue(null);
		setFinished(false);
		move(target);
	}
	function skip() {
		if (transitioning.current || Date.now() - lastNavigation.current < 500)
			return;
		lastNavigation.current = Date.now();
		const current = currentRef.current;
		if (entriesRef.current[current].status !== "answered") {
			const next = entriesRef.current.map((entry, i) =>
				i === current ? { status: "skipped" as const } : entry,
			);
			entriesRef.current = next;
			setEntries(next);
		}
		advance();
	}
	function complete(response: T, correct?: boolean) {
		const current = currentRef.current;
		if (
			transitioning.current ||
			entriesRef.current[current].status === "answered"
		)
			return false;
		transitioning.current = true;
		const next = entriesRef.current.map((entry, i) =>
			i === current ? { status: "answered" as const, response } : entry,
		);
		entriesRef.current = next;
		setEntries(next);
		const kind =
			correct === true ? "correct" : correct === false ? "wrong" : "received";
		if (perQuestionFeedback)
			setCue({
				kind,
				text:
					kind === "correct"
						? "ถูกต้องค่ะ"
						: kind === "wrong"
							? "ไม่เป็นไร ไปต่อกันนะคะ"
							: "รับคำตอบแล้วค่ะ",
				audioSrc: patientAudioManifest.feedback[kind],
			});
		const count = next.filter((entry) => entry.status === "answered").length;
		const afterFeedback = () => {
			clearTimer();
			if (count % 5 === 0 && !milestones.current.has(count)) {
				milestones.current.add(count);
				const message = chooseEncouragement(
					count,
					total,
					previousMessage.current,
				);
				previousMessage.current = message.id;
				setCue({
					kind: "milestone",
					text: message.text,
					audioSrc: patientAudioManifest.milestones[`${message.id}-${count}`],
				});
				pendingStep.current = advance;
				timer.current = setTimeout(
					advance,
					patientAudioManifest.milestones[`${message.id}-${count}`]
						? 20000
						: 2400,
				);
			} else advance();
		};
		pendingStep.current = afterFeedback;
		timer.current = setTimeout(
			afterFeedback,
			perQuestionFeedback
				? patientAudioManifest.feedback[kind]
					? 20000
					: 1800
				: 0,
		);
		return true;
	}
	const answered = entries.filter(
		(entry) => entry.status === "answered",
	).length;
	const continueNow = useCallback(() => {
		if (pendingStep.current) {
			clearTimer();
			pendingStep.current();
		}
	}, [clearTimer]);
	return {
		index,
		revision,
		entries,
		cue,
		finished,
		answered,
		remaining: total - answered,
		goTo,
		skip,
		complete,
		continueNow,
	};
}
