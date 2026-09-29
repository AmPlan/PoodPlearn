import { NextRequest, NextResponse } from 'next/server';

import { calculateAssessmentItemScore, getAssessmentCategoryKey, resolveAssessmentCategories } from '@/lib/assessmentCategories';
import { prisma } from '@/lib/prisma';
import { verifyAnswer } from '@/lib/grader';
import { AuthSession, withAuth } from '@/lib/auth';
import { checkPatientPermission } from '@/lib/server/utils/patientUtils';

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

export const POST = withAuth(['PATIENT', 'THERAPIST'], async (
  req: NextRequest,
  session: AuthSession,
  { params }: RouteContext
) => {
  try {
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
    const permission = await checkPatientPermission(session, assessment.patientId);
    if (permission !== true) {
      return permission;
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
});