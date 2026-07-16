export interface TranscribeOptions {
  prompt?: string;
}

export interface TranscribeResult {
  text: string;
  durationSeconds: number;
  modelUsed: string;
}

export interface GradeRequest {
  asrText: string;
  expectedAnswer: string;
}

export interface GradeResult {
  isCorrect: boolean;
  correctness: number;
  wordErrorRate: number;
  tokenOverlap: number;
  tokenizedAsr: string[];
  tokenizedExpected: string[];
}

export interface TranscribeErrorResponse {
  error: string;
}

export const ALLOWED_AUDIO_EXTENSIONS = [
  ".wav",
  ".mp3",
  ".m4a",
  ".flac",
  ".ogg",
  ".aac",
] as const;
