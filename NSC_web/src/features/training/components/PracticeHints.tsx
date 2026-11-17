"use client";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";
import { practiceAction } from "./practiceStyles";

type Category = "spontaneous" | "comprehension" | "repetition" | "naming";
export function PracticeHints({
	category,
	source,
	answer,
	disabled,
	play,
	onCount,
	feature,
	initialSyllable,
	hintSources,
	answerSource,
	answerContent,
}: {
	category: Category;
	source?: string;
	answer?: string;
	disabled: boolean;
	play: (source?: string, onEnded?: () => void, rate?: number) => Promise<void>;
	onCount: (count: number) => void;
	feature?: string;
	initialSyllable?: string;
	hintSources?: (string | undefined)[];
	answerSource?: string;
	answerContent?: ReactNode;
}) {
	const [count, setCount] = useState(0);
	const lock = useRef(false);
	const step = useRef(0);
	const maximum = category === "spontaneous" ? 2 : 3;
	const reveal = count === maximum;
	const nextIsAnswer = count === maximum - 1;
	const needsAudio = category === "repetition" || !nextIsAnswer;
	const nextSource =
		category === "naming"
			? nextIsAnswer
				? answerSource
				: hintSources?.[count]
			: source;
	const nextText =
		category === "naming"
			? [feature, initialSyllable, answer][count]
			: undefined;
	const unavailable =
		category === "naming"
			? !nextText && !nextSource
			: needsAudio
				? !source
				: !answer && !answerContent;
	return (
		<div className="flex flex-col items-center gap-3">
			<button
				type="button"
				className={practiceAction}
				disabled={disabled || reveal || unavailable}
				onClick={async () => {
					if (
						disabled ||
						unavailable ||
						lock.current ||
						step.current >= maximum
					)
						return;
					lock.current = true;
					const next = step.current + 1;
					step.current = next;
					setCount(next);
					onCount(next);
					const rate = category === "repetition" ? [0.75, 0.5, 1][next - 1] : 1;
					if (
						category === "naming"
							? nextSource
							: category === "repetition" || next < maximum
					) {
						await play(nextSource, undefined, rate);
						lock.current = false;
					} else lock.current = false;
				}}
			>
				<Lightbulb aria-hidden="true" />
				{reveal || nextIsAnswer ? "เฉลย" : "คำใบ้"}
			</button>
			{reveal && (
				<div
					role="status"
					className="max-w-3xl text-center text-3xl font-semibold text-[#118a82]"
				>
					{answerContent || answer}
				</div>
			)}
			{category === "naming" && count > 0 && !reveal && (
				<p
					role="status"
					className="max-w-sm text-center text-xl text-[#526f65]"
				>
					{[feature, initialSyllable][count - 1]}
				</p>
			)}
			{category === "naming" && unavailable && !reveal && (
				<p className="text-base text-[#638078]">
					{count === 1 ? "รอคำใบ้พยางค์แรก" : "รอคำใบ้จากระบบ"}
				</p>
			)}
			{category !== "naming" && !reveal && needsAudio && !source && (
				<p className="text-base text-[#638078]">รอเสียงคำใบ้</p>
			)}
			{category !== "naming" &&
				!reveal &&
				!needsAudio &&
				!answer &&
				!answerContent && (
					<p className="text-base text-[#638078]">รอเฉลยจากระบบ</p>
				)}
		</div>
	);
}
