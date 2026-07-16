export type CategoryScore = {
  category: string;
  score: number;
  maxScore: number;
};

export type ProgressBySession = {
  date: string;
  spontaneous: number;
  comprehension: number;
  repetition: number;
  naming: number;
};

export type SessionResultItem = {
  id: string;
  date: string;
  audioUrl?: string;
  asrTranscript?: string;
  expectedAnswer?: string;
  aiCorrect?: boolean;
  therapistReviewStatus?: "not-reviewed" | "correct" | "incorrect" | "needs-review";
  therapistNote?: string;
};

export type ResponseStatusByCategory = {
  category: string;
  correct: number;
  incorrect: number;
  needsPractice: number;
  pendingReview: number;
};
