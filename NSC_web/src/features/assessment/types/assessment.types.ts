export type QuestionCategory =
  | "spontaneous"
  | "comprehension"
  | "repetition"
  | "naming";

export type StandardAssessmentCategory = QuestionCategory;

export type QuestionInteractionType =
  | "voice_question"
  | "image_choice"
  | "yes_no_choice"
  | "repeat_after"
  | "name_image";

export type QuestionChoice = {
  id: string;
  label: string;
  imageSrc?: string;
  imageUrl?: string;
  isCorrect: boolean;
};

export type AssessmentHint = {
  level: 1 | 2 | 3;
  type:
  | "repeat_question"
  | "feature"
  | "initial_sound"
  | "slow_repetition"
  | "normal_repetition"
  | "answer";
  text: string;
};

export type StandardAssessmentQuestion = {
  id: string;
  order: number;
  category: QuestionCategory;
  categoryLabel: string;
  interactionType: QuestionInteractionType;
  promptText: string;
  expectedAnswer?: string;
  imageSrc?: string;
  imageUrl?: string;
  questionAudioSrc?: string;
  choices?: QuestionChoice[];
  hints?: AssessmentHint[];
  hintText?: string;
};

export type StandardAssessmentIntro = {
  title: string;
  subtitle: string;
  infoItems: string[];
  startButtonText: string;
  startFeedbackMessage: string;
};

export type StandardAssessmentSession = {
  sessionId: string;
  totalQuestions: number;
  questions: StandardAssessmentQuestion[];
};

export type AssessmentAnswer = {
  questionId: string;
  answerType: "mock_audio" | "image_choice" | "yes_no_choice" | "skipped";
  selectedOptionId?: string;
  answerImageUrl?: string;
  answerBoolean?: boolean;
  mockRecordingState?: "recorded";
  mockAnswer?: string;
  voiceFile?: Blob;
  hintLevelUsed?: 0 | 1 | 2 | 3;
  hintCountUsed?: 0 | 1 | 2 | 3;
  responseTimeMs?: number;
  isCorrect?: boolean;
  skipped?: boolean;
};

export type SavedAssessmentAnswer = {
  answerId: string;
  questionId: string;
  answerType: AssessmentAnswer["answerType"];
  selectedOptionId?: string;
  mockRecordingState?: AssessmentAnswer["mockRecordingState"];
  hintCountUsed?: AssessmentAnswer["hintCountUsed"];
  responseTimeMs?: AssessmentAnswer["responseTimeMs"];
  isCorrect?: boolean;
  skipped?: boolean;
  savedAt: string;
};

export type AssessmentCategorySummary = {
  category: StandardAssessmentCategory;
  label: string;
  recommendedDifficultyId: number;
  summaryText: string;
  noteText: string;
};

export type StandardAssessmentResult = {
  sessionId: string;
  title: string;
  subtitle: string;
  completedQuestions: number;
  totalQuestions: number;
  summaryTitle: string;
  summaryText: string;
  categorySummaries: AssessmentCategorySummary[];
  homeButtonText: string;
};

export type AssessmentServiceSuccessResult<T> = {
  success: true;
  data: T;
  errorMessage?: never;
};

export type AssessmentServiceFailureResult = {
  success: false;
  data?: never;
  errorMessage: string;
};

export type AssessmentServiceResult<T> =
  | AssessmentServiceSuccessResult<T>
  | AssessmentServiceFailureResult;
