import { prisma } from '@/lib/prisma';
import { gradeWithService, transcribeWithService, transcribeCompareWithService } from '@/lib/whisperClient';
import { resolveCustomCondition as resolveCustomConditionSpontaneous } from '@/lib/spontaneousCustomConditions';
import { resolveCustomCondition as resolveCustomConditionComprehension } from '@/lib/comprehensionCustomConditions';
import fs from 'fs/promises';
import path from 'path';

export type VerifyInput = {
  questionId: number;
  audio?: Blob;
  answerText?: string;
  answerImageUrl?: string;
  answerBoolean?: boolean;
};

export type VerifyOutput = {
  isCorrect: boolean;
  correctness: number;
  asrText?: string;
  answerBoolean?: boolean;
  audioFileName?: string;
  sttModel?: string;
};

export type SubmitInput = VerifyInput & {
  hintsUsed: number;
};

export type SubmitOutput = VerifyOutput & {
  score: number;
};

export type ModelResult = {
  text: string;
  modelUsed: string;
  isCorrect: boolean;
  correctness: number;
};

export type CompareVerifyOutput = {
  model1?: ModelResult;
  model2?: ModelResult;
  audioFileName?: string;
};

async function resolveAsrText(
  input: VerifyInput,
  correctAnswer: string
): Promise<{ text: string; fileName: string; modelUsed: string } | undefined> {
  if (input.audio) {
    try {
      const timestamp = Date.now();

      // 1. Determine the correct file extension from the Blob's MIME type
      // Default to 'webm' if the type is missing, as it's the most common browser format
      let extension = 'webm';
      if (input.audio.type) {
        if (input.audio.type.includes('mp4') || input.audio.type.includes('m4a')) {
          extension = 'm4a';
        } else if (input.audio.type.includes('wav')) {
          extension = 'wav';
        } else if (input.audio.type.includes('ogg')) {
          extension = 'ogg';
        }
      }

      // 2. Apply the correct extension to the filename
      const filename = `${timestamp}_${input.questionId}_${correctAnswer}.${extension}`;

      // Send to transcription service 
      const result = await transcribeWithService(input.audio, filename, {
        prompt: correctAnswer
      });
      
      return { text: result.text, fileName: filename, modelUsed: result.modelUsed };
    } catch (error) {
      console.error("Error processing and saving audio:", error);
      return undefined;
    }
  }
  return undefined;
}
async function getQuestionDetail(questionId: number) {
  return prisma.question.findUnique({
    where: { questionId },
    include: {
      namingQuestions: true,
      comprehensionImageQuestions: true,
      ComprehensionQuestion: true,
      repetitionQuestions: true,
      spontaneousQuestions: true,
    },
  });
}

async function getExpectedAnswer(
  question: NonNullable<Awaited<ReturnType<typeof getQuestionDetail>>>, patientId: number
): Promise<{ type: 'text'; value: string } | { type: 'image'; value: string } | { type: 'boolean'; value: boolean } | null> {

  switch (question.questionType) {
    case 'NAMING':
      if (!question.namingQuestions[0]) return null;
      return { type: 'text', value: question.namingQuestions[0].correctAnswer };

    case 'REPETITION':
      if (!question.repetitionQuestions[0]) return null;
      return { type: 'text', value: question.repetitionQuestions[0].text };

    case 'COMPREHENSION_IMAGE':
      if (!question.comprehensionImageQuestions[0]) return null;
      return { type: 'image', value: question.comprehensionImageQuestions[0].correctImageUrl };

    case 'COMPREHENSION':
      if (!question.ComprehensionQuestion[0]) return null;

      if (question.ComprehensionQuestion[0].correctAnswer != null) {
        return { type: 'boolean', value: question.ComprehensionQuestion[0].correctAnswer! };
      }
      else if (question.ComprehensionQuestion[0].customCondition) {
        const conditionString = question.ComprehensionQuestion[0].customCondition;
        const resolvedValue = await resolveCustomConditionComprehension(conditionString, patientId);
        if (resolvedValue != null) {
          return { type: 'boolean', value: resolvedValue };
        }
        return null;
      }
      return null;

    case 'SPONTANEOUS':
      if (!question.spontaneousQuestions[0]) return null;

      if (question.spontaneousQuestions[0].correctAnswer) {
        return { type: 'text', value: question.spontaneousQuestions[0].correctAnswer };
      }
      else if (question.spontaneousQuestions[0].customCondition) {
        const conditionString = question.spontaneousQuestions[0].customCondition;
        const resolvedValue = await resolveCustomConditionSpontaneous(conditionString, patientId);
        if (resolvedValue) {
          return { type: 'text', value: resolvedValue };
        }
        return null;
      }
      return null;

    default:
      return null;
  }
}

async function fuzzyGradeText(asrText: string, expected: string): Promise<{ isCorrect: boolean; correctness: number }> {
  try {
    const result = await gradeWithService(asrText, expected);
    return { isCorrect: result.isCorrect, correctness: result.correctness };
  } catch (error: unknown) {
    console.log(error);
    throw error;
  }
}

export async function verifyAnswer(input: VerifyInput, patientId: number): Promise<VerifyOutput> {
  const question = await getQuestionDetail(input.questionId);
  if (!question) throw new Error(`Question ${input.questionId} not found.`);

  const expected = await getExpectedAnswer(question, patientId);
  if (!expected) return { isCorrect: false, correctness: 0 };

  switch (expected.type) {
    case 'text': {
      if (input.answerText) {
        const normalizedExpected = expected.value.trim().toLowerCase();
        const normalizedAnswer = input.answerText.trim().toLowerCase();
        const isCorrect = normalizedExpected === normalizedAnswer;
        return { isCorrect, correctness: isCorrect ? 1 : 0, asrText: input.answerText };
      }

      const asrResult = await resolveAsrText(input, expected.value);
      if (!asrResult) return { isCorrect: false, correctness: 0 };
      const result = await fuzzyGradeText(asrResult.text, expected.value);
      return { ...result, asrText: asrResult.text, audioFileName: asrResult.fileName, sttModel: asrResult.modelUsed };
    }

    case 'image': {
      const isCorrect = input.answerImageUrl === expected.value;
      return { isCorrect, correctness: isCorrect ? 1 : 0 };
    }

    case 'boolean': {
      const answerBoolean: boolean | undefined | null = input.answerBoolean;

      if (answerBoolean === undefined || answerBoolean === null) {
        return { isCorrect: false, correctness: 0, answerBoolean };
      }

      const isCorrect = answerBoolean === expected.value;
      return { isCorrect, correctness: isCorrect ? 1 : 0, answerBoolean };
    }
  }
}

export async function submitAnswer(input: SubmitInput, patientId: number): Promise<SubmitOutput> {
  const verifyResult = await verifyAnswer(input, patientId);

  const question = await getQuestionDetail(input.questionId);
  if (!question) throw new Error(`Question ${input.questionId} not found.`);

  let hintPenalty = 0;
  const baseScore = verifyResult.isCorrect ? 1 : 0;

  switch (question.questionType) {
    case 'NAMING':
    case 'REPETITION':
    case 'COMPREHENSION':
      switch (input.hintsUsed) {
        case 1:
          hintPenalty = 0.5;
          break;
        case 2:
          hintPenalty = 0.75;
          break;
        case 3:
          hintPenalty = 1;
          break;
      }
      break;
    case 'SPONTANEOUS':
      hintPenalty = 0.5 * input.hintsUsed;
      break;
  }

  const score = Math.max(0, baseScore - hintPenalty);

  return {
    ...verifyResult,
    score,
  };
}

/**
 * Saves the audio payload locally and requests transcriptions from both models
 * using the multi-model comparison service endpoint.
 */
async function resolveAsrTextCompare(
  input: VerifyInput,
  correctAnswer: string
): Promise<{
  model1: { text: string; modelUsed: string };
  model2: { text: string; modelUsed: string };
  fileName: string
} | undefined> {
  if (!input.audio) return undefined;

  try {
    const timestamp = Date.now();

    let extension = 'webm';
    if (input.audio.type) {
      if (input.audio.type.includes('mp4') || input.audio.type.includes('m4a')) {
        extension = 'm4a';
      } else if (input.audio.type.includes('wav')) {
        extension = 'wav';
      } else if (input.audio.type.includes('ogg')) {
        extension = 'ogg';
      }
    }

    const filename = `${timestamp}_compare_${input.questionId}_${correctAnswer}.${extension}`;

    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const filePath = path.join(tempDir, filename);
    const arrayBuffer = await input.audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // Call the dual-model service wrapper
    const result = await transcribeCompareWithService(input.audio, filename, {
      prompt: correctAnswer,
    });

    return {
      model1: { text: result.model1.text, modelUsed: result.model1.modelUsed },
      model2: { text: result.model2.text, modelUsed: result.model2.modelUsed },
      fileName: filename,
    };
  } catch (error) {
    console.error("Error processing audio for comparison:", error);
    return undefined;
  }
}

/**
 * Validates audio input against both transcription models, running the fuzzy-matching 
 * grading pipeline against the expected answer text for each output.
 */
export async function verifyAnswerWithComparison(
  input: VerifyInput,
  patientId: number
): Promise<CompareVerifyOutput> {
  const question = await getQuestionDetail(input.questionId);
  if (!question) throw new Error(`Question ${input.questionId} not found.`);

  const expected = await getExpectedAnswer(question, patientId);
  if (!expected || expected.type !== 'text') {
    throw new Error("Comparison endpoint only supports text-based question evaluation.");
  }

  // Fallback to text matching if text was sent directly instead of an audio block
  if (input.answerText) {
    const normalizedExpected = expected.value.trim().toLowerCase();
    const normalizedAnswer = input.answerText.trim().toLowerCase();
    const isCorrect = normalizedExpected === normalizedAnswer;

    const singleResult: ModelResult = {
      text: input.answerText,
      modelUsed: "direct_text_input",
      isCorrect,
      correctness: isCorrect ? 1 : 0
    };
    return { model1: singleResult, model2: singleResult };
  }

  // Process and extract dual transcriptions
  const asrCompareResult = await resolveAsrTextCompare(input, expected.value);
  if (!asrCompareResult) return {};

  // Simultaneously grade both outputs using your existing fuzzy grading rules
  const [grade1, grade2] = await Promise.all([
    fuzzyGradeText(asrCompareResult.model1.text, expected.value),
    fuzzyGradeText(asrCompareResult.model2.text, expected.value),
  ]);

  return {
    audioFileName: asrCompareResult.fileName,
    model1: {
      text: asrCompareResult.model1.text,
      modelUsed: asrCompareResult.model1.modelUsed,
      isCorrect: grade1.isCorrect,
      correctness: grade1.correctness,
    },
    model2: {
      text: asrCompareResult.model2.text,
      modelUsed: asrCompareResult.model2.modelUsed,
      isCorrect: grade2.isCorrect,
      correctness: grade2.correctness,
    },
  };
}

export type CompareSubmitOutput = {
  model1?: ModelResult & { score: number };
  model2?: ModelResult & { score: number };
  audioFileName?: string;
};

export async function submitAnswerWithComparison(
  input: SubmitInput,
  patientId: number
): Promise<CompareSubmitOutput> {
  // 1. Run the base dual-model verification
  const verifyResult = await verifyAnswerWithComparison(input, patientId);

  const question = await getQuestionDetail(input.questionId);
  if (!question) throw new Error(`Question ${input.questionId} not found.`);

  // 2. Calculate the hint penalty (this logic remains exactly the same as your standard submitAnswer)
  let hintPenalty = 0;
  switch (question.questionType) {
    case 'NAMING':
    case 'REPETITION':
    case 'COMPREHENSION':
      switch (input.hintsUsed) {
        case 1: hintPenalty = 0.5; break;
        case 2: hintPenalty = 0.75; break;
        case 3: hintPenalty = 1; break;
      }
      break;
    case 'SPONTANEOUS':
      hintPenalty = 0.5 * input.hintsUsed;
      break;
  }

  // 3. Apply the penalty to both models independently based on their individual correctness
  const buildScore = (isCorrect: boolean) => Math.max(0, (isCorrect ? 1 : 0) - hintPenalty);

  return {
    audioFileName: verifyResult.audioFileName,
    model1: verifyResult.model1 ? {
      ...verifyResult.model1,
      score: buildScore(verifyResult.model1.isCorrect)
    } : undefined,
    model2: verifyResult.model2 ? {
      ...verifyResult.model2,
      score: buildScore(verifyResult.model2.isCorrect)
    } : undefined,
  };
}