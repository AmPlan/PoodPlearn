import { TranscribeOptions, TranscribeResult, GradeRequest, GradeResult } from "@/types/whisper";

const WHISPER_SERVICE_URL = process.env.ASR_SERVICE_URL;

export async function transcribeWithService(
  audio: Blob,
  filename: string,
  options: TranscribeOptions = {}
): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("prompt", options.prompt ?? "");

  const res = await fetch(`${WHISPER_SERVICE_URL}/transcribe`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Whisper service error (${res.status}): ${detail}`);
  }

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

  const res = await fetch(`${WHISPER_SERVICE_URL}/transcribe-compare`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Whisper comparison service error (${res.status}): ${detail}`);
  }

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

  const res = await fetch(`${WHISPER_SERVICE_URL}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    console.log("Grade service error");
    throw new Error(`Grade service error (${res.status}): ${detail}`);
  }

  return res.json();
}