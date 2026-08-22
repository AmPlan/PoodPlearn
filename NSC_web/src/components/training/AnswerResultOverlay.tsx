import { Check, X } from "lucide-react";

type AnswerResultFeedbackState = "correct" | "wrong" | null;

type AnswerResultOverlayProps = {
	visible: boolean;
	feedbackState: AnswerResultFeedbackState;
	correctAnswer?: string;
	onClose: () => void;
};

export function AnswerResultOverlay({
	visible,
	feedbackState,
	correctAnswer,
	onClose,
}: AnswerResultOverlayProps) {
	if (!visible || !feedbackState) return null;

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

				{!isCorrect && correctAnswer ? (
					<p className="mt-3 text-base font-bold text-[#B42318] sm:text-lg">
						โปรดลองอีกครั้ง
					</p>
				) : null}
			</div>
		</div>
	);
}