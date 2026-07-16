"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { FeedbackBubble } from "./FeedbackBubble";

type PrimaryActionButtonProps = {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  feedbackMessage?: string;
  feedbackDurationMs?: number;
  className?: string;
  onClick?: () => void | Promise<void>;
};

export function PrimaryActionButton({
  children,
  type = "button",
  disabled = false,
  isLoading = false,
  loadingText,
  feedbackMessage,
  feedbackDurationMs = 700,
  className = "",
  onClick,
}: PrimaryActionButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const isDisabled = disabled || isLoading || isProcessing;

  async function handleClick() {
    if (isDisabled) {
      return;
    }

    setIsProcessing(true);

    if (feedbackMessage) {
      setShowFeedback(true);
      await new Promise((resolve) => setTimeout(resolve, feedbackDurationMs));
    }

    await onClick?.();

    setShowFeedback(false);
    setIsProcessing(false);
  }

  return (
    <div className="relative">
      {feedbackMessage ? (
        <FeedbackBubble message={feedbackMessage} isVisible={showFeedback} />
      ) : null}

      <button
        className={`flex min-h-[72px] w-full items-center justify-center rounded-full bg-[#1FA89C] px-8 py-5 text-center text-2xl font-bold text-white shadow-[0_18px_38px_rgba(31,168,156,0.28)] outline-none transition duration-150 hover:bg-[#178F84] hover:shadow-[0_22px_44px_rgba(31,168,156,0.34)] focus:ring-4 focus:ring-[#1FA89C]/30 active:scale-95 active:bg-[#13786F] disabled:cursor-not-allowed disabled:bg-[#8ECFCA] disabled:opacity-70 disabled:shadow-none disabled:active:scale-100 sm:text-[1.65rem] ${className}`}
        type={type}
        disabled={isDisabled}
        onClick={handleClick}
      >
        {isLoading || isProcessing ? loadingText || children : children}
      </button>
    </div>
  );
}
