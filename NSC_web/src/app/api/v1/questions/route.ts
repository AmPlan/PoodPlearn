import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type QuestionTypeValue = 'NAMING' | 'COMPREHENSION' | 'REPETITION' | 'SPONTANEOUS' | 'COMPREHENSION_IMAGE';

type CreateQuestionBody = {
  questionType?: QuestionTypeValue;
  type?: QuestionTypeValue;
  difficultyId?: number | null; // <-- NEW
  questionText?: string;
  questionVoiceUrl?: string;
  correctAnswer?: string | boolean;
  correctAnswerVoiceUrl?: string;
  imageUrl?: string;
  hint1Text?: string;
  hint1VoiceUrl?: string;
  hint2Text?: string;
  hint2VoiceUrl?: string;
  correctImageUrl?: string;
  wrongImageUrl1?: string;
  wrongImageUrl2?: string;
  text?: string;
  textVoiceUrl?: string;
  customCondition?: string;
};

const questionTypes: QuestionTypeValue[] = [
  'NAMING',
  'COMPREHENSION',
  'COMPREHENSION_IMAGE',
  'REPETITION',
  'SPONTANEOUS',
];

const requiredFieldsByType: Record<QuestionTypeValue, string[]> = {
  NAMING: [
    'correctAnswer',
    'correctAnswerVoiceUrl',
    'imageUrl',
    'hint1Text',
    'hint1VoiceUrl',
    'hint2Text',
    'hint2VoiceUrl',
  ],
  COMPREHENSION_IMAGE: [
    'questionText',
    'questionVoiceUrl',
    'correctImageUrl',
    'wrongImageUrl1',
    'wrongImageUrl2',
  ],
  COMPREHENSION: [
    'questionText',
    'questionVoiceUrl',
  ],
  REPETITION: ['text', 'textVoiceUrl'],
  SPONTANEOUS: [
    // correctAnswer and correctAnswerVoiceUrl are handled dynamically in the POST route
    'questionText',
    'questionVoiceUrl',
  ],
};

function isQuestionType(value: string | undefined): value is QuestionTypeValue {
  return questionTypes.includes(value as QuestionTypeValue);
}

function parseQuestionId(rawQuestionId: string | null) {
  if (!rawQuestionId) {
    return null;
  }

  const questionId = Number(rawQuestionId);

  return Number.isInteger(questionId) && questionId > 0 ? questionId : null;
}

function requireText(value: unknown, fieldName: string) {
  if (typeof value !== 'string') {
    return { error: `${fieldName} is required and must be a string.` };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return { error: `${fieldName} is required.` };
  }

  return { value: trimmed };
}

function requireBoolean(value: unknown, fieldName: string) {
  if (typeof value === 'boolean') {
    return { value };
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true') return { value: true };
    if (lower === 'false') return { value: false };
  }

  return { error: `${fieldName} is required and must be a boolean (true or false).` };
}

function getQuestionData(questionType: QuestionTypeValue, questionId: number) {
  switch (questionType) {
    case 'NAMING':
      return prisma.namingQuestion.findFirst({ where: { questionId } });
    case 'COMPREHENSION':
      return prisma.comprehensionQuestion.findFirst({ where: { questionId } });
    case 'COMPREHENSION_IMAGE':
      return prisma.comprehensionImageQuestion.findFirst({ where: { questionId } });
    case 'REPETITION':
      return prisma.repetitionQuestion.findFirst({ where: { questionId } });
    case 'SPONTANEOUS':
      return prisma.spontaneousQuestion.findFirst({ where: { questionId } });
  }
}

function buildQuestionUpdateData(questionType: QuestionTypeValue, body: CreateQuestionBody) {
  switch (questionType) {
    case 'NAMING': {
      const data: Record<string, string> = {};

      if (body.correctAnswer !== undefined) {
        const value = requireText(body.correctAnswer, 'correctAnswer');
        if ('error' in value) return value;
        data.correctAnswer = value.value;
      }
      if (body.correctAnswerVoiceUrl !== undefined) {
        const value = requireText(body.correctAnswerVoiceUrl, 'correctAnswerVoiceUrl');
        if ('error' in value) return value;
        data.correctAnswerVoiceUrl = value.value;
      }
      if (body.imageUrl !== undefined) {
        const value = requireText(body.imageUrl, 'imageUrl');
        if ('error' in value) return value;
        data.imageUrl = value.value;
      }
      if (body.hint1Text !== undefined) {
        const value = requireText(body.hint1Text, 'hint1Text');
        if ('error' in value) return value;
        data.hint1Text = value.value;
      }
      if (body.hint1VoiceUrl !== undefined) {
        const value = requireText(body.hint1VoiceUrl, 'hint1VoiceUrl');
        if ('error' in value) return value;
        data.hint1VoiceUrl = value.value;
      }
      if (body.hint2Text !== undefined) {
        const value = requireText(body.hint2Text, 'hint2Text');
        if ('error' in value) return value;
        data.hint2Text = value.value;
      }
      if (body.hint2VoiceUrl !== undefined) {
        const value = requireText(body.hint2VoiceUrl, 'hint2VoiceUrl');
        if ('error' in value) return value;
        data.hint2VoiceUrl = value.value;
      }

      if (Object.keys(data).length === 0 && body.difficultyId === undefined) { // <-- NEW
        return { error: 'No question fields were provided to update.' };
      }

      return data;
    }

    case 'COMPREHENSION_IMAGE': {
      const data: Record<string, string> = {};

      if (body.questionText !== undefined) {
        const value = requireText(body.questionText, 'questionText');
        if ('error' in value) return value;
        data.questionText = value.value;
      }
      if (body.questionVoiceUrl !== undefined) {
        const value = requireText(body.questionVoiceUrl, 'questionVoiceUrl');
        if ('error' in value) return value;
        data.questionVoiceUrl = value.value;
      }
      if (body.correctImageUrl !== undefined) {
        const value = requireText(body.correctImageUrl, 'correctImageUrl');
        if ('error' in value) return value;
        data.correctImageUrl = value.value;
      }
      if (body.wrongImageUrl1 !== undefined) {
        const value = requireText(body.wrongImageUrl1, 'wrongImageUrl1');
        if ('error' in value) return value;
        data.wrongImageUrl1 = value.value;
      }
      if (body.wrongImageUrl2 !== undefined) {
        const value = requireText(body.wrongImageUrl2, 'wrongImageUrl2');
        if ('error' in value) return value;
        data.wrongImageUrl2 = value.value;
      }

      if (Object.keys(data).length === 0 && body.difficultyId === undefined) { // <-- NEW
        return { error: 'No question fields were provided to update.' };
      }

      return data;
    }

    case 'COMPREHENSION': {
      const data: Record<string, any> = {};

      if (body.correctAnswer !== undefined) {
        const value = requireBoolean(body.correctAnswer, 'correctAnswer');
        if ('error' in value) return value;
        data.correctAnswer = value.value;
      }
      if (body.customCondition !== undefined) {
        const value = requireText(body.customCondition, 'customCondition');
        if ('error' in value) return value;
        data.customCondition = value.value;
      }
      if (body.questionText !== undefined) {
        const value = requireText(body.questionText, 'questionText');
        if ('error' in value) return value;
        data.questionText = value.value;
      }
      if (body.questionVoiceUrl !== undefined) {
        const value = requireText(body.questionVoiceUrl, 'questionVoiceUrl');
        if ('error' in value) return value;
        data.questionVoiceUrl = value.value;
      }

      if (Object.keys(data).length === 0 && body.difficultyId === undefined) { // <-- NEW
        return { error: 'No question fields were provided to update.' };
      }

      return data;
    }

    case 'REPETITION': {
      const data: Record<string, string> = {};

      if (body.text !== undefined) {
        const value = requireText(body.text, 'text');
        if ('error' in value) return value;
        data.text = value.value;
      }
      if (body.textVoiceUrl !== undefined) {
        const value = requireText(body.textVoiceUrl, 'textVoiceUrl');
        if ('error' in value) return value;
        data.textVoiceUrl = value.value;
      }

      if (Object.keys(data).length === 0 && body.difficultyId === undefined) { // <-- NEW
        return { error: 'No question fields were provided to update.' };
      }

      return data;
    }

    case 'SPONTANEOUS': {
      const data: Record<string, string | null> = {};

      if (body.customCondition !== undefined) {
        const value = requireText(body.customCondition, 'customCondition');
        if ('error' in value) return value;
        data.customCondition = value.value;
      }
      if (body.correctAnswer !== undefined) {
        const value = requireText(body.correctAnswer, 'correctAnswer');
        if ('error' in value) return value;
        data.correctAnswer = value.value;
      }
      if (body.correctAnswerVoiceUrl !== undefined) {
        const value = requireText(body.correctAnswerVoiceUrl, 'correctAnswerVoiceUrl');
        if ('error' in value) return value;
        data.correctAnswerVoiceUrl = value.value;
      }
      if (body.questionText !== undefined) {
        const value = requireText(body.questionText, 'questionText');
        if ('error' in value) return value;
        data.questionText = value.value;
      }
      if (body.questionVoiceUrl !== undefined) {
        const value = requireText(body.questionVoiceUrl, 'questionVoiceUrl');
        if ('error' in value) return value;
        data.questionVoiceUrl = value.value;
      }

      if (Object.keys(data).length === 0 && body.difficultyId === undefined) { // <-- NEW
        return { error: 'No question fields were provided to update.' };
      }

      return data;
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const questionId = parseQuestionId(
      searchParams.get('questionId') ?? searchParams.get('questionID')
    );

    if (!questionId) {
      return NextResponse.json(
        { error: 'questionId is required in query params.' },
        { status: 400 }
      );
    }

    const question = await prisma.question.findUnique({
      where: { questionId },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    const questionDetail = await getQuestionData(question.questionType, questionId);

    return NextResponse.json(
      {
        data: {
          questionId: question.questionId,
          questionType: question.questionType,
          difficultyId: question.difficultyId, // <-- NEW
          questionDetail,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to get question by id:', error);
    return NextResponse.json({ error: 'Unable to get question.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (session.role !== 'THERAPIST') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const rawBody = await req.json();

    const bodies: CreateQuestionBody[] = Array.isArray(rawBody) ? rawBody : [rawBody];

    if (bodies.length === 0) {
      return NextResponse.json(
        { error: 'No questions provided for creation.' },
        { status: 400 }
      );
    }

    const validationErrors: string[] = [];

    bodies.forEach((body, index) => {
      const questionType = body.questionType ?? body.type;

      if (!isQuestionType(questionType)) {
        validationErrors.push(
          `Item [${index}]: Invalid questionType. Use NAMING, COMPREHENSION, COMPREHENSION_IMAGE, REPETITION, or SPONTANEOUS.`
        );
        return;
      }

      // <-- NEW: Validate difficultyId if provided
      if (body.difficultyId !== undefined && body.difficultyId !== null) {
        if (typeof body.difficultyId !== 'number') {
          validationErrors.push(`Item [${index}]: difficultyId must be a number.`);
        }
      }

      const requiredFields = requiredFieldsByType[questionType];

      const missingFields = requiredFields.filter((field) => {
        const value = body[field as keyof CreateQuestionBody];

        if (field === 'correctAnswer' && questionType === 'COMPREHENSION') {
          return value === undefined || value === null || value === '';
        }

        return typeof value !== 'string' || value.trim() === '';
      });

      if (missingFields.length > 0) {
        validationErrors.push(
          `Item [${index}] (${questionType}): Missing required fields: ${missingFields.join(', ')}.`
        );
      }

      // Special conditional validation for SPONTANEOUS
      if (questionType === 'SPONTANEOUS') {
        const hasCustomCondition = typeof body.customCondition === 'string' && body.customCondition.trim() !== '';
        const hasCorrectAnswer = typeof body.correctAnswer === 'string' && body.correctAnswer.trim() !== '';

        if (!hasCustomCondition && !hasCorrectAnswer) {
          validationErrors.push(`Item [${index}] (SPONTANEOUS): Must provide either 'correctAnswer' or 'customCondition'.`);
        }

        if (hasCorrectAnswer) {
          const hasCorrectAnswerVoice = typeof body.correctAnswerVoiceUrl === 'string' && body.correctAnswerVoiceUrl.trim() !== '';
          if (!hasCorrectAnswerVoice) {
            validationErrors.push(`Item [${index}] (SPONTANEOUS): 'correctAnswerVoiceUrl' is required if 'correctAnswer' is provided.`);
          }
        }
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed.', details: validationErrors },
        { status: 400 }
      );
    }

    const createdQuestions = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const body of bodies) {
        const questionType = (body.questionType ?? body.type) as QuestionTypeValue;

        const question = await tx.question.create({
          data: {
            questionType,
            difficultyId: body.difficultyId ?? null, // <-- NEW
          },
        });

        let questionDetail: object;

        switch (questionType) {
          case 'NAMING':
            questionDetail = await tx.namingQuestion.create({
              data: {
                questionId: question.questionId,
                correctAnswer: (body.correctAnswer as string)!.trim(),
                correctAnswerVoiceUrl: body.correctAnswerVoiceUrl!.trim(),
                imageUrl: body.imageUrl!.trim(),
                hint1Text: body.hint1Text!.trim(),
                hint1VoiceUrl: body.hint1VoiceUrl!.trim(),
                hint2Text: body.hint2Text!.trim(),
                hint2VoiceUrl: body.hint2VoiceUrl!.trim(),
              },
            });
            break;
          case 'COMPREHENSION_IMAGE':
            questionDetail = await tx.comprehensionImageQuestion.create({
              data: {
                questionId: question.questionId,
                questionText: body.questionText!.trim(),
                questionVoiceUrl: body.questionVoiceUrl!.trim(),
                correctImageUrl: body.correctImageUrl!.trim(),
                wrongImageUrl1: body.wrongImageUrl1!.trim(),
                wrongImageUrl2: body.wrongImageUrl2!.trim(),
              },
            });
            break;
          case 'COMPREHENSION': {
            let parsedAnswer = null;
            if (body.correctAnswer !== undefined) {
              parsedAnswer = typeof body.correctAnswer === 'boolean'
                ? body.correctAnswer
                : body.correctAnswer!.toString().toLowerCase().trim() === 'true';
            }

            questionDetail = await tx.comprehensionQuestion.create({
              data: {
                questionId: question.questionId,
                customCondition: body.customCondition ?? null,
                correctAnswer: parsedAnswer,
                questionText: body.questionText!.trim(),
                questionVoiceUrl: body.questionVoiceUrl!.trim(),
              },
            });
            break;
          }
          case 'REPETITION':
            questionDetail = await tx.repetitionQuestion.create({
              data: {
                questionId: question.questionId,
                text: body.text!.trim(),
                textVoiceUrl: body.textVoiceUrl!.trim(),
              },
            });
            break;
          case 'SPONTANEOUS':
            questionDetail = await tx.spontaneousQuestion.create({
              data: {
                questionId: question.questionId,
                customCondition: body.customCondition ? body.customCondition.trim() : null,
                correctAnswer: body.correctAnswer ? (body.correctAnswer as string).trim() : null,
                correctAnswerVoiceUrl: body.correctAnswerVoiceUrl ? body.correctAnswerVoiceUrl.trim() : null,
                questionText: body.questionText!.trim(),
                questionVoiceUrl: body.questionVoiceUrl!.trim(),
              },
            });
            break;
        }

        results.push({ question, questionDetail });
      }

      return results;
    });

    return NextResponse.json(
      {
        message: `Successfully created ${createdQuestions.length} question(s).`,
        data: createdQuestions,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create question(s):', error);
    return NextResponse.json(
      { error: 'Unable to create question(s).' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (session.role !== 'THERAPIST') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const questionId = parseQuestionId(
      searchParams.get('questionId') ?? searchParams.get('questionID')
    );

    if (!questionId) {
      return NextResponse.json(
        { error: 'questionId is required in query params.' },
        { status: 400 }
      );
    }

    const question = await prisma.question.findUnique({
      where: { questionId },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    const body = (await req.json()) as CreateQuestionBody;
    const requestedQuestionType = body.questionType ?? body.type;

    if (requestedQuestionType && requestedQuestionType !== question.questionType) {
      return NextResponse.json(
        {
          error:
            'Changing questionType is not supported in this edit endpoint. Update the existing question content only.',
        },
        { status: 400 }
      );
    }

    const detailUpdateData = buildQuestionUpdateData(question.questionType, body);

    if ('error' in detailUpdateData) {
      return NextResponse.json({ error: detailUpdateData.error }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const questionUpdateData: { questionType?: QuestionTypeValue, difficultyId?: number | null } = {};

      if (requestedQuestionType) {
        questionUpdateData.questionType = requestedQuestionType;
      }

      // <-- NEW: Handle difficultyId updates
      if (body.difficultyId !== undefined) {
        if (body.difficultyId !== null && typeof body.difficultyId !== 'number') {
          throw new Error('difficultyId must be a number or null.'); // Will be caught by the outer catch block
        }
        questionUpdateData.difficultyId = body.difficultyId;
      }

      if (Object.keys(questionUpdateData).length > 0) {
        await tx.question.update({
          where: { questionId },
          data: questionUpdateData,
        });
      }

      if (Object.keys(detailUpdateData).length > 0) { // <-- NEW: Protect against empty updates if ONLY difficultyId changed
        switch (question.questionType) {
          case 'NAMING':
            await tx.namingQuestion.updateMany({
              where: { questionId },
              data: detailUpdateData,
            });
            break;
          case 'COMPREHENSION_IMAGE':
            await tx.comprehensionImageQuestion.updateMany({
              where: { questionId },
              data: detailUpdateData,
            });
            break;
          case 'COMPREHENSION':
            await tx.comprehensionQuestion.updateMany({
              where: { questionId },
              data: detailUpdateData,
            });
            break;
          case 'REPETITION':
            await tx.repetitionQuestion.updateMany({
              where: { questionId },
              data: detailUpdateData,
            });
            break;
          case 'SPONTANEOUS':
            await tx.spontaneousQuestion.updateMany({
              where: { questionId },
              data: detailUpdateData,
            });
            break;
        }
      }
    });

    const updatedQuestion = await prisma.question.findUnique({
      where: { questionId },
    });

    const updatedQuestionDetail = await getQuestionData(question.questionType, questionId);

    if (!updatedQuestion || !updatedQuestionDetail) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: 'Question updated successfully.',
        data: {
          questionId: updatedQuestion.questionId,
          questionType: updatedQuestion.questionType,
          difficultyId: updatedQuestion.difficultyId, // <-- NEW
          questionDetail: updatedQuestionDetail,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Failed to update question:', error);
    // Custom handling if our difficulty validation throws above
    if (error.message === 'difficultyId must be a number or null.') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update question.' }, { status: 500 });
  }
}