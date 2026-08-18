type FeedbackBubbleProps = {
	message: string;
	isVisible: boolean;
	className?: string;
};

export function FeedbackBubble({
	message,
	isVisible,
	className = "",
}: FeedbackBubbleProps) {
	if (!isVisible) {
		return null;
	}

	return (
		// The wrapper covers the whole screen (inset-0) to block clicks on other elements.
		// It uses flexbox to perfectly center the bubble.
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
			<p
				className={`whitespace-nowrap rounded-full bg-[#123232] px-18 py-9 text-4xl font-semibold text-white shadow-[0_16px_34px_rgba(18,50,50,0.18)] ${className}`}
				role="status"
				aria-live="polite"
			>
				{message}
			</p>
		</div>
	);
}