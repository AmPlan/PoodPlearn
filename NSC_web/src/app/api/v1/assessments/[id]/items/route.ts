import { NextRequest, NextResponse, after } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { calculateAssessmentItemScore, getAssessmentCategoryKey, resolveAssessmentCategories } from '@/lib/assessmentCategories';
import { prisma } from '@/lib/prisma';
import { verifyAnswer, verifyAnswerWithComparison } from '@/lib/grader';

interface AssessmentInput {
  questionId: number;
  responseTime: number;
  voiceFile?: File;
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
    const assessmentResultId = Number(id);

    if (!Number.isInteger(assessmentResultId) || assessmentResultId <= 0) {
      return NextResponse.json({ error: 'Invalid assessment ID.' }, { status: 400 });
    }

    // --- 3. Fetch Assessment & Authorize ---
    const assessment = await prisma.assessmentResult.findUnique({
      where: { assessmentResultId },
      select: { patientId: true, endedAt: true, setId: true },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
    }
    if (assessment.endedAt) {
      return NextResponse.json({ error: 'Assessment is already completed.' }, { status: 400 });
    }
    if (session.role !== 'THERAPIST' && session.patientId !== assessment.patientId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // --- 4. Parse & Group Form Data into a Clean Object ---
    const formData = await req.formData();
    const voiceFileRaw = formData.get('voiceFile');
    const answerBooleanRaw = formData.get('answerBoolean') as string | boolean | null;

    const inputData: AssessmentInput = {
      questionId: Number(formData.get('questionId')),
      responseTime: Number(formData.get('responseTime')),
      voiceFile: voiceFileRaw instanceof File ? voiceFileRaw : undefined,
      answerImageUrl: formData.get('answerImageUrl')?.toString() || undefined,
      answerBoolean: answerBooleanRaw === 'true' ? true : answerBooleanRaw === 'false' ? false : undefined,
    };

    if (!Number.isInteger(inputData.questionId) || inputData.questionId <= 0) {
      return NextResponse.json({ error: 'A valid questionId is required.' }, { status: 400 });
    }

    if (!Number.isFinite(inputData.responseTime) || inputData.responseTime < 0) {
      return NextResponse.json({ error: 'A valid responseTime is required.' }, { status: 400 });
    }

    // --- 5. Grade the Answer (primary, authoritative result) ---
    const verifyResult = await verifyAnswer({
      questionId: inputData.questionId,
      audio: inputData.voiceFile,
      answerImageUrl: inputData.answerImageUrl,
      answerBoolean: inputData.answerBoolean,
    }, assessment.patientId);

    const question = await prisma.question.findUnique({
      where: { questionId: inputData.questionId },
      include: {
        trainingSets: {
          include: {
            trainingSet: {
              include: {
                difficultyLevel: true,
              },
            },
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    const categoryKey = getAssessmentCategoryKey(question.questionType);

    if (!categoryKey) {
      return NextResponse.json({ error: 'Unsupported assessment question type.' }, { status: 400 });
    }

    const matchingTrainingSet = question.trainingSets.find((relation) => relation.setId === assessment.setId)
      ?? question.trainingSets[0];

    if (!matchingTrainingSet) {
      return NextResponse.json({ error: 'Training set not found for question.' }, { status: 400 });
    }

    const score = calculateAssessmentItemScore({
      categoryKey,
      questionType: question.questionType,
      trainingSetDifficultyLevel: matchingTrainingSet.trainingSet.difficultyLevel?.difficultyLevel ?? 1,
      isCorrect: verifyResult.isCorrect,
    });

    // --- 6. Save the Primary (Scored) Result to Database ---
    const item = await prisma.$transaction(async (tx) => {
      const savedItem = await tx.assessmentItemResult.create({
        data: {
          assessmentResultId,
          questionId: inputData.questionId,
          asrText: verifyResult.asrText ?? null,
          responseTime: Number.isNaN(inputData.responseTime) ? null : inputData.responseTime,
          answerImageUrl: inputData.answerImageUrl ?? null,
          isCorrect: verifyResult.isCorrect,
          correctness: verifyResult.correctness,
          answerBoolean: verifyResult.answerBoolean ?? inputData.answerBoolean,
          sttModel: verifyResult.sttModel ?? null,
          audioFileName: verifyResult.audioFileName ?? null,

        },
      });

      const assessmentCategories = await resolveAssessmentCategories(tx);
      const matchingCategory = assessmentCategories.find((category) => category.key === categoryKey.toUpperCase());

      if (!matchingCategory) {
        throw new Error('Assessment category mapping not found.');
      }

      let categoryResult = await tx.assessmentCategoryResult.findFirst({
        where: {
          assessmentResultId,
          categoryId: matchingCategory.categoryId,
        },
      });

      if (!categoryResult) {
        categoryResult = await tx.assessmentCategoryResult.create({
          data: {
            assessmentResultId,
            categoryId: matchingCategory.categoryId,
            totalScore: 0,
            maxScore: 0,
            recommendedDifficultyId: null,
          },
        });
      }

      await tx.assessmentCategoryResult.update({
        where: {
          assessmentCategoryResultId: categoryResult.assessmentCategoryResultId,
        },
        data: {
          totalScore: Number(categoryResult.totalScore) + score.totalScore,
          maxScore: Number(categoryResult.maxScore) + score.maxScore,
        },
      });

      return savedItem;
    });

    // --- 7. Schedule Comparison Grading for AFTER the Response is Sent ---
    // Pure logging for later analysis: never touches assessmentCategoryResult
    // totals, doesn't affect the client response, and its failure must not
    // affect the primary grading flow (already saved and returned above).
    //after(async () => {
    //  try {
    //    const compareResult = await verifyAnswerWithComparison({
    //      questionId: inputData.questionId,
    //      audio: inputData.voiceFile,
    //      answerImageUrl: inputData.answerImageUrl,
    //      answerBoolean: inputData.answerBoolean,
    //    }, assessment.patientId);

//    //    const modelsToLog: Array<{
    //      text: string;
    //      modelUsed: string;
    //      isCorrect: boolean;
    //      correctness: number;
    //      audioFileName?: string;
    //    }> = [];

//    //    if (compareResult.model1) modelsToLog.push({ ...compareResult.model1, audioFileName: compareResult.audioFileName });
    //    if (compareResult.model2) modelsToLog.push({ ...compareResult.model2, audioFileName: compareResult.audioFileName });

//    //    if (modelsToLog.length > 0) {
    //      await prisma.$transaction(
    //        modelsToLog.map((modelResult) =>
    //          prisma.assessmentItemResult.create({
    //            data: {
    //              assessmentResultId,
    //              questionId: inputData.questionId,
    //              asrText: modelResult.text ?? null,
    //              responseTime: Number.isNaN(inputData.responseTime) ? null : inputData.responseTime,
    //              answerImageUrl: inputData.answerImageUrl ?? null,
    //              isCorrect: modelResult.isCorrect,
    //              correctness: modelResult.correctness,
    //              answerBoolean: inputData.answerBoolean,
    //              sttModel: modelResult.modelUsed ?? null,
    //              audioFileName: modelResult.audioFileName ?? null,
    //            },
    //          })
    //        )
    //      );
    //    }
    //  } catch (comparisonError) {
    //    // Comparison logging is best-effort; nothing to return to a client
    //    // that's already gone, just log for observability.
    //    console.error('Comparison grading failed (non-fatal, post-response):', comparisonError);
    //  }
    //});

    // --- 8. Return Success Immediately ---
    // The response goes out now; the comparison-grading block above runs after.
    return NextResponse.json(
      {
        message: 'Assessment answer recorded.',
        data: item,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Failed to record assessment item:', error);
    return NextResponse.json(
      { error: 'Unable to record assessment answer.' },
      { status: 500 }
    );
  }
}