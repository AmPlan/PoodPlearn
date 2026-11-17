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
					isCorrect ? "bg-[#E9F9F0]" : "bg-[#EAF4FC]"
				}`}
			>
				<div
					className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white sm:h-20 sm:w-20 ${
						isCorrect ? "bg-[#1FA89C]" : "bg-[#5891B3]"
					}`}
					aria-hidden="true"
				>
					<span className="text-4xl">{isCorrect ? "🌈" : "🌱"}</span>
				</div>

				<h3 className="mt-4 text-2xl font-bold leading-tight text-[#123232] sm:mt-5 sm:text-3xl">
					{isCorrect ? "ถูกต้องค่ะ" : "ไม่เป็นไร ไปต่อกันนะคะ"}
				</h3>

				<button
					type="button"
					onClick={onClose}
					className="mt-5 min-h-14 rounded-2xl bg-white px-8 text-xl font-bold text-[#176e66]"
				>
					ต่อ
				</button>
			</div>
		</div>
	);
}
