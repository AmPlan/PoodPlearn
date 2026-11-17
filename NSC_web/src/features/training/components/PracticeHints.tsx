"use client";
import { useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { practiceAction } from "./practiceStyles";

type Category = "spontaneous" | "comprehension" | "repetition";
export function PracticeHints({
	category,
	source,
	answer,
	disabled,
	play,
	onCount,
}: {
	category: Category;
	source?: string;
	answer?: string;
	disabled: boolean;
	play: (source?: string, onEnded?: () => void, rate?: number) => Promise<void>;
	onCount: (count: number) => void;
}) {
	const [count, setCount] = useState(0);
	const lock = useRef(false);
	const step = useRef(0);
	const maximum = category === "spontaneous" ? 2 : 3;
	const reveal = count === maximum;
	const nextIsAnswer = count === maximum - 1;
	const needsAudio = category === "repetition" || !nextIsAnswer;
	return (
		<div className="flex flex-col items-center gap-3">
			<button
				type="button"
				className={practiceAction}
				disabled={disabled || reveal || (needsAudio ? !source : !answer)}
				onClick={async () => {
					if (disabled || lock.current || step.current >= maximum) return;
					lock.current = true;
					const next = step.current + 1;
					step.current = next;
					setCount(next);
					onCount(next);
					const rate = category === "repetition" ? [0.75, 0.5, 1][next - 1] : 1;
					if (category === "repetition" || next < maximum) {
						await play(source, undefined, rate);
						lock.current = false;
					} else lock.current = false;
				}}
			>
				<Lightbulb aria-hidden="true" />
				{reveal || nextIsAnswer ? "เฉลย" : "คำใบ้"}
			</button>
			{reveal && (
				<p
					role="status"
					className="max-w-3xl text-center text-3xl font-semibold text-[#118a82]"
				>
					{answer}
				</p>
			)}
			{!reveal && needsAudio && !source && (
				<p className="text-base text-[#638078]">รอเสียงคำใบ้</p>
			)}
			{!reveal && !needsAudio && !answer && (
				<p className="text-base text-[#638078]">รอเฉลยจากระบบ</p>
			)}
		</div>
	);
}
