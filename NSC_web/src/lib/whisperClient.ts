import { TranscribeOptions, TranscribeResult, GradeRequest, GradeResult } from "@/types/whisper";

const WHISPER_SERVICE_URL = process.env.ASR_SERVICE_URL;

export class AudioServiceError extends Error {
  constructor(
    message: string,
    readonly service: 'transcription' | 'grading',
    readonly status?: number
  ) {
    super(message);
    this.name = 'AudioServiceError';
  }
}

async function readServiceError(res: Response, service: AudioServiceError['service']): Promise<AudioServiceError> {
  const payload = await res.json().catch(() => null) as { detail?: unknown; error?: unknown } | null;
  const detail = typeof payload?.detail === 'string'
    ? payload.detail
    : typeof payload?.error === 'string'
      ? payload.error
      : res.statusText || 'Unknown service error';
  return new AudioServiceError(`Audio ${service} service failed (${res.status}): ${detail}`, service, res.status);
}

async function callAudioService(
  url: string,
  init: RequestInit,
  service: AudioServiceError['service']
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Connection failed';
    throw new AudioServiceError(`Audio ${service} service is unavailable: ${detail}`, service);
  }
  if (!res.ok) throw await readServiceError(res, service);
  return res;
}

export async function transcribeWithService(
  audio: Blob,
  filename: string,
  options: TranscribeOptions = {}
): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("prompt", options.prompt ?? "");

  const res = await callAudioService(`${WHISPER_SERVICE_URL}/transcribe`, {
    method: "POST",
    body: form,
  }, 'transcription');

  const data = await res.json();
  return {
    text: data.text,
    durationSeconds: data.duration_seconds,
    modelUsed: data.model_used
  };
}

/**
 * Sends audio to the /transcribe-compare endpoint to get transcriptions from two different models simultaneously.
 */
export async function transcribeCompareWithService(
  audio: Blob,
  filename: string,
  options: TranscribeOptions = {}
): Promise<{ model1: TranscribeResult; model2: TranscribeResult }> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("prompt", options.prompt ?? "");

  const res = await callAudioService(`${WHISPER_SERVICE_URL}/transcribe-compare`, {
    method: "POST",
    body: form,
  }, 'transcription');

  const data = await res.json();
  return {
    model1: {
      text: data.model1.text,
      durationSeconds: data.model1.duration_seconds,
      modelUsed: data.model1.model_used,
    },
    model2: {
      text: data.model2.text,
      durationSeconds: data.model2.duration_seconds,
      modelUsed: data.model2.model_used,
    },
  };
}

export async function gradeWithService(
  asrText: string,
  expectedAnswer: string
): Promise<GradeResult> {
  const body: GradeRequest = { asrText, expectedAnswer };

  const res = await callAudioService(`${WHISPER_SERVICE_URL}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, 'grading');

  return res.json();
}
