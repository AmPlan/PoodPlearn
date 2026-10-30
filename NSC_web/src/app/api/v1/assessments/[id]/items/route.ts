import { NextRequest, NextResponse } from 'next/server';

import { calculateAssessmentItemScore, getAssessmentCategoryKey, resolveAssessmentCategories } from '@/lib/assessmentCategories';
import { prisma } from '@/lib/prisma';
import { verifyAnswer } from '@/lib/grader';
import { AudioServiceError } from '@/lib/whisperClient';
import { AuthSession, withAuth } from '@/server/auth';
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

    const questionInAssessmentSet = await prisma.trainingSetQuestion.findUnique({
      where: {
        setId_questionId: {
          setId: assessment.setId,
          questionId: inputData.questionId,
        },
      },
      select: { questionId: true },
    });

    if (!questionInAssessmentSet) {
      return NextResponse.json(
        { error: 'Question does not belong to the assessment training set.' },
        { status: 400 }
      );
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

    const matchingTrainingSet = question.trainingSets.find((relation) => relation.setId === assessment.setId);

    if (!matchingTrainingSet) {
      return NextResponse.json({ error: 'Training set not found for question.' }, { status: 400 });
    }

    // --- 6. Save the Primary (Scored) Result to Database ---
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ assessment_result_id: number }>>`
        SELECT assessment_result_id
        FROM "Assessment_Results"
        WHERE assessment_result_id = ${assessmentResultId}
        FOR UPDATE
      `;

      const currentAssessment = await tx.assessmentResult.findUnique({
        where: { assessmentResultId },
        select: { endedAt: true },
      });

      if (!currentAssessment) {
        throw new Error('Assessment not found.');
      }

      if (currentAssessment.endedAt) {
        throw new Error('Assessment is already completed.');
      }

      const stillInAssessmentSet = await tx.trainingSetQuestion.findUnique({
        where: {
          setId_questionId: {
            setId: assessment.setId,
            questionId: inputData.questionId,
          },
        },
        select: { questionId: true },
      });

      if (!stillInAssessmentSet) {
        throw new Error('Question does not belong to the assessment training set.');
      }

      const existingItem = await tx.assessmentItemResult.findUnique({
        where: {
          assessmentResultId_questionId: {
            assessmentResultId,
            questionId: inputData.questionId,
          },
        },
        select: { assessmentItemResultId: true },
      });

      const itemData = {
        asrText: verifyResult.asrText ?? null,
        responseTime: inputData.responseTime,
        answerImageUrl: inputData.answerImageUrl ?? null,
        isCorrect: verifyResult.isCorrect,
        correctness: verifyResult.correctness,
        answerBoolean: verifyResult.answerBoolean ?? inputData.answerBoolean,
      };

      const savedItem = existingItem
        ? await tx.assessmentItemResult.update({
            where: {
              assessmentItemResultId: existingItem.assessmentItemResultId,
            },
            data: itemData,
          })
        : await tx.assessmentItemResult.create({
            data: {
              ...itemData,
              assessmentResultId,
              questionId: inputData.questionId,
            },
          });

      const assessmentCategories = await resolveAssessmentCategories(tx);
      const assessmentItems = await tx.assessmentItemResult.findMany({
        where: { assessmentResultId },
        include: {
          question: {
            select: {
              questionType: true,
              trainingSets: {
                where: { setId: assessment.setId },
                select: {
                  trainingSet: {
                    select: {
                      difficultyLevel: {
                        select: { difficultyLevel: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const categoryScores = new Map(
        assessmentCategories.map((category) => [
          category.categoryId,
          { totalScore: 0, maxScore: 0 },
        ]),
      );

      for (const assessmentItem of assessmentItems) {
        const itemCategoryKey = getAssessmentCategoryKey(
          assessmentItem.question.questionType,
        );
        const itemCategory = assessmentCategories.find(
          (category) => category.key === itemCategoryKey,
        );

        if (!itemCategory) {
          continue;
        }

        const itemDifficulty =
          assessmentItem.question.trainingSets[0]?.trainingSet.difficultyLevel
            .difficultyLevel ?? 1;
        const itemScore = calculateAssessmentItemScore({
          categoryKey: itemCategory.key,
          questionType: assessmentItem.question.questionType,
          trainingSetDifficultyLevel: itemDifficulty,
          isCorrect: assessmentItem.isCorrect,
        });
        const categoryScore = categoryScores.get(itemCategory.categoryId);

        if (categoryScore) {
          categoryScore.totalScore += itemScore.totalScore;
          categoryScore.maxScore += itemScore.maxScore;
        }
      }

      for (const category of assessmentCategories) {
        const categoryScore = categoryScores.get(category.categoryId);
        const categoryResult = await tx.assessmentCategoryResult.findFirst({
          where: {
            assessmentResultId,
            categoryId: category.categoryId,
          },
        });

        if (categoryResult && categoryScore) {
          await tx.assessmentCategoryResult.update({
            where: {
              assessmentCategoryResultId:
                categoryResult.assessmentCategoryResultId,
            },
            data: categoryScore,
          });
        } else if (categoryScore) {
          await tx.assessmentCategoryResult.create({
            data: {
              assessmentResultId,
              categoryId: category.categoryId,
              ...categoryScore,
              recommendedDifficultyId: null,
            },
          });
        }
      }

      return { item: savedItem, created: !existingItem };
    });

    return NextResponse.json(
      {
        message: 'Assessment answer recorded.',
        data: result.item,
      },
      { status: result.created ? 201 : 200 }
    );

  } catch (error) {
    console.error('Failed to record assessment item:', error);
    if (error instanceof Error && error.message === 'Assessment not found.') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Assessment is already completed.') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AudioServiceError) {
      return NextResponse.json(
        { error: error.message, code: 'AUDIO_SERVICE_ERROR', service: error.service },
        { status: 502 }
      );
    }
    if (error instanceof Error && error.message === 'Question does not belong to the assessment training set.') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Unable to record assessment answer.' },
      { status: 500 }
    );
  }
});
