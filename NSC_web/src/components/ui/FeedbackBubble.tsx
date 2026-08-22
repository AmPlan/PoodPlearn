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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto">
            <div
                // Changed to `flex-col` (vertical stack) and `items-center` to perfectly center everything.
                // Slightly increased vertical padding (py-8 to md:py-12) to balance the stacked layout.
                className={`flex w-full max-w-[95vw] md:max-w-4xl flex-col items-center justify-center gap-4 md:gap-6 rounded-3xl bg-[#123232] px-6 py-8 shadow-[0_16px_34px_rgba(18,50,50,0.3)] md:px-12 md:py-12 ${className}`}
                role="status"
                aria-live="polite"
            >
                {/* Removed top margin since it is now stacked, kept the large size */}
                <svg
                    className="h-12 w-12 shrink-0 text-emerald-400 md:h-16 md:w-16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                
                {/* Changed back to `text-center`. It now looks beautifully balanced below the icon. */}
                <p className="text-center text-xl font-semibold leading-normal text-white wrap-break-word md:text-3xl lg:text-4xl">
                    {message}
                </p>
            </div>
        </div>
    );
}