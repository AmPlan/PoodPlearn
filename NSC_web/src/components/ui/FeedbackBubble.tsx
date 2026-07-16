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
    <p
      className={`pointer-events-none absolute -top-16 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#123232] px-6 py-3 text-lg font-semibold text-white shadow-[0_16px_34px_rgba(18,50,50,0.18)] ${className}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  );
}
