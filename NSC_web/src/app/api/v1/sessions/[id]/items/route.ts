import { NextRequest, NextResponse, after } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { submitAnswer, submitAnswerWithComparison } from '@/lib/grader';

interface SessionInput {
  questionId: number;
  responseTime: number;
  voiceFile?: File;
  answerText?: string;
  hintsUsed: number;
  answerImageUrl?: string;
  answerBoolean?: boolean;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    // --- 1. Authentication ---
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // --- 2. Validate URL Parameters ---
    const { id } = await params;
    const sessionId = Number(id);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: 'Invalid session ID.' }, { status: 400 });
    }

    // --- 3. Fetch Session & Authorize ---
    const sessionResult = await prisma.sessionResult.findUnique({
      where: { sessionId },
    });

    if (!sessionResult) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    if (session.role !== 'THERAPIST' && session.patientId !== sessionResult.patientId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // --- 4. Parse & Group Form Data ---
    const formData = await req.formData();
    const voiceFileRaw = formData.get('voiceFile');
    const answerBooleanRaw = formData.get('answerBoolean') as string | null;
    const answerTextRaw = formData.get('answerText')?.toString();

    const inputData: SessionInput = {
      questionId: Number(formData.get('questionId')),
      responseTime: Number(formData.get('responseTime')),
      hintsUsed: Number(formData.get('hintsUsed')) || 0,
      voiceFile: voiceFileRaw instanceof File ? voiceFileRaw : undefined,
      answerText: answerTextRaw?.trim() ? answerTextRaw.trim() : undefined,
      answerImageUrl: formData.get('answerImageUrl')?.toString() || undefined,
      answerBoolean: answerBooleanRaw === 'true' ? true : answerBooleanRaw === 'false' ? false : undefined,
    };

    if (!Number.isInteger(inputData.questionId) || inputData.questionId <= 0) {
      return NextResponse.json({ error: 'A valid questionId is required.' }, { status: 400 });
    }

    if (!Number.isFinite(inputData.responseTime) || inputData.responseTime < 0) {
      return NextResponse.json({ error: 'A valid responseTime is required.' }, { status: 400 });
    }

    // --- 5. Submit the Answer to Grader (primary, authoritative result) ---
    const submitResult = await submitAnswer({
      questionId: inputData.questionId,
      audio: inputData.voiceFile,
      hintsUsed: inputData.hintsUsed,
      answerImageUrl: inputData.answerImageUrl,
      answerBoolean: inputData.answerBoolean,
      answerText: inputData.answerText,
    }, sessionResult.patientId);

    // --- 6. Save the Primary (Scored) Result to Database ---
    const savedItem = await prisma.$transaction(async (tx) => {
      // Find the active session category automatically using the sessionId
      const cat = await tx.sessionCategoryResult.findFirst({
        where: {
          sessionId: sessionId,
          endedAt: null // Looks for the currently active category
        },
        orderBy: {
          sessionCategoryId: 'desc' // Ensures we get the most recent one if multiple exist
        }
      });

      if (!cat) {
        throw new Error('Active session category not found for this session.');
      }

      const item = await tx.sessionItemResult.create({
        data: {
          sessionCategoryId: cat.sessionCategoryId, // Derived from the query above
          questionId: inputData.questionId,
          asrText: submitResult.asrText ?? null,
          hintsUsed: inputData.hintsUsed,
          score: submitResult.score,
          responseTime: inputData.responseTime,
          correctness: submitResult.correctness,
          answerImageUrl: inputData.answerImageUrl ?? null,
          answerBoolean: submitResult.answerBoolean ?? inputData.answerBoolean,
          sttModel: submitResult.sttModel ?? null,
          audioFileName: submitResult.audioFileName ?? null,

        },
      });

      return item;
    });

    // --- 7. Schedule Comparison Grading for AFTER the Response is Sent ---
    // Pure logging for later analysis: doesn't touch the primary score/session
    // item saved above, doesn't affect the client response, and its failure
    // must not affect the primary grading flow (already saved and returned).
    //after(async () => {
    //  try {
    //    const compareResult = await submitAnswerWithComparison({
    //      questionId: inputData.questionId,
    //      audio: inputData.voiceFile,
    //      hintsUsed: inputData.hintsUsed,
    //      answerImageUrl: inputData.answerImageUrl,
    //      answerBoolean: inputData.answerBoolean,
    //      answerText: inputData.answerText,
    //    }, sessionResult.patientId);
//
    //    const modelsToLog: Array<{
    //      text: string;
    //      modelUsed: string;
    //      isCorrect: boolean;
    //      correctness: number;
    //      score: number;
    //      audioFileName?: string;
    //    }> = [];
//
    //    if (compareResult.model1) modelsToLog.push({ ...compareResult.model1, audioFileName: compareResult.audioFileName });
    //    if (compareResult.model2) modelsToLog.push({ ...compareResult.model2, audioFileName: compareResult.audioFileName });
//
    //    if (modelsToLog.length === 0) {
    //      return;
    //    }
//
    //    await prisma.$transaction(async (tx) => {
    //      const cat = await tx.sessionCategoryResult.findFirst({
    //        where: {
    //          sessionId: sessionId,
    //          endedAt: null,
    //        },
    //        orderBy: {
    //          sessionCategoryId: 'desc',
    //        },
    //      });
//
    //      if (!cat) {
    //        throw new Error('Active session category not found for this session.');
    //      }
//
    //      for (const modelResult of modelsToLog) {
    //        await tx.sessionItemResult.create({
    //          data: {
    //            sessionCategoryId: cat.sessionCategoryId,
    //            questionId: inputData.questionId,
    //            asrText: modelResult.text ?? null,
    //            hintsUsed: inputData.hintsUsed,
    //            score: modelResult.score,
    //            responseTime: inputData.responseTime,
    //            correctness: modelResult.correctness,
    //            answerImageUrl: inputData.answerImageUrl ?? null,
    //            answerBoolean: inputData.answerBoolean,
    //            sttModel: modelResult.modelUsed ?? null,
    //            audioFileName: modelResult.audioFileName ?? null,
    //          },
    //        });
    //      }
    //    });
    //  } catch (comparisonError) {
    //    // Comparison logging is best-effort; nothing to return to a client
    //    // that's already gone, just log for observability.
    //    console.error('Comparison grading failed (non-fatal, post-response):', comparisonError);
    //  }
    //});

    // --- 8. Return Success Immediately with Explicit Grading Results ---
    // The response goes out now; the comparison-grading block above runs after.
    return NextResponse.json(
      {
        message: 'Session answer recorded.',
        isCorrect: submitResult.isCorrect,
        score: submitResult.score,
        correctness: submitResult.correctness,
        data: savedItem,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to record session item:', error);

    // Catch specific logic errors thrown inside the transaction
    if (
      error.message === 'Question 0 not found.' ||
      error.message === 'Active session category not found for this session.'
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Unable to record session answer.' },
      { status: 500 }
    );
  }
}