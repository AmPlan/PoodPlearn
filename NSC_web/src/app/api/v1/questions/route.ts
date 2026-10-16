import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { Prisma, prisma } from '@/lib/prisma';
import { withAuth } from '@/server/auth';

/* -------------------------------------------------------------------------- */
/*  Field schemas                                                             */
/* -------------------------------------------------------------------------- */

const INVALID_TYPE_ERROR = 'Invalid questionType.';
const INVALID_ID_ERROR = 'questionId must be a positive integer in query params.';
const INVALID_JSON_ERROR = 'Request body must be valid JSON.';

const QUESTION_TYPES = [
  'NAMING',
  'COMPREHENSION',
  'REPETITION',
  'SPONTANEOUS',
  'COMPREHENSION_IMAGE',
] as const;

const QuestionType = z.enum(QUESTION_TYPES, { error: INVALID_TYPE_ERROR });
type QuestionType = z.infer<typeof QuestionType>;

/** Trimmed, non-empty string with readable error messages. */
const nonEmpty = z
  .string({ error: (issue) => (issue.input === undefined ? 'Required.' : 'Must be a string.') })
  .trim()
  .min(1, 'Must not be empty.');

/** Optional numeric FK; `null` clears it. */
const difficultyId = z.number().nullable().optional();

/**
 * Detail fields for each question type.
 * Single source of truth: used as-is for create and `.partial()` for update.
 */
const DETAIL_SHAPES = {
  NAMING: {
    correctAnswer: nonEmpty,
    correctAnswerVoiceUrl: nonEmpty,
    imageUrl: nonEmpty,
    hint1Text: nonEmpty,
    hint1VoiceUrl: nonEmpty,
    hint2Text: nonEmpty,
    hint2VoiceUrl: nonEmpty,
  },
  COMPREHENSION_IMAGE: {
    questionText: nonEmpty,
    questionVoiceUrl: nonEmpty,
    correctImageUrl: nonEmpty,
    wrongImageUrl1: nonEmpty,
    wrongImageUrl2: nonEmpty,
  },
  COMPREHENSION: {
    questionText: nonEmpty,
    questionVoiceUrl: nonEmpty,
    correctAnswer: z.boolean().optional(),
    customCondition: nonEmpty.optional(),
  },
  REPETITION: {
    text: nonEmpty,
    textVoiceUrl: nonEmpty,
  },
  SPONTANEOUS: {
    questionText: nonEmpty,
    questionVoiceUrl: nonEmpty,
    correctAnswer: nonEmpty.optional(),
    correctAnswerVoiceUrl: nonEmpty.optional(),
    customCondition: nonEmpty.optional(),
  },
} satisfies Record<QuestionType, z.ZodRawShape>;

/* -------------------------------------------------------------------------- */
/*  Create schema                                                             */
/* -------------------------------------------------------------------------- */

/** Supports the legacy `type` alias for `questionType`. */
function applyTypeAlias(raw: unknown) {
  if (typeof raw !== 'object' || raw === null) return raw;
  const { type, ...rest } = raw as Record<string, unknown>;
  return { ...rest, questionType: rest.questionType ?? type };
}

const variant = <T extends QuestionType, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.object({ questionType: z.literal(type), difficultyId, ...shape });

const CreateQuestionBody = z.preprocess(
  applyTypeAlias,
  z.discriminatedUnion(
    'questionType',
    [
      variant('NAMING', DETAIL_SHAPES.NAMING),
      variant('COMPREHENSION_IMAGE', DETAIL_SHAPES.COMPREHENSION_IMAGE),
      variant('COMPREHENSION', DETAIL_SHAPES.COMPREHENSION),
      variant('REPETITION', DETAIL_SHAPES.REPETITION),
      variant('SPONTANEOUS', DETAIL_SHAPES.SPONTANEOUS)
        .refine((body) => body.correctAnswer || body.customCondition, {
          message: "Provide either 'correctAnswer' or 'customCondition'.",
        })
        .refine((body) => !body.correctAnswer || body.correctAnswerVoiceUrl, {
          path: ['correctAnswerVoiceUrl'],
          message: "'correctAnswerVoiceUrl' is required if 'correctAnswer' is provided.",
        }),
    ],
    { error: INVALID_TYPE_ERROR },
  ),
);
type CreateBody = z.infer<typeof CreateQuestionBody>;

/* -------------------------------------------------------------------------- */
/*  Update schemas                                                            */
/* -------------------------------------------------------------------------- */

const PatchEnvelope = z.preprocess(
  applyTypeAlias,
  z.object({ questionType: QuestionType.optional(), difficultyId }),
);

const UPDATE_SCHEMAS = {
  NAMING: z.object(DETAIL_SHAPES.NAMING).partial(),
  COMPREHENSION_IMAGE: z.object(DETAIL_SHAPES.COMPREHENSION_IMAGE).partial(),
  COMPREHENSION: z.object(DETAIL_SHAPES.COMPREHENSION).partial(),
  REPETITION: z.object(DETAIL_SHAPES.REPETITION).partial(),
  SPONTANEOUS: z.object(DETAIL_SHAPES.SPONTANEOUS).partial(),
} satisfies Record<QuestionType, z.ZodType>;

type DetailUpdate = Record<string, string | boolean>;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const jsonError = (error: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...extra }, { status });

const formatIssue = (issue: z.core.$ZodIssue) =>
  issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message;

const QuestionIdSchema = z.coerce.number().int().positive();

function getQuestionId(req: NextRequest): number | null {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('questionId') ?? searchParams.get('questionID');
  const result = QuestionIdSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Parses the request body, returning `{ ok: false }` instead of throwing on malformed JSON. */
async function readJson(req: NextRequest): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    return { ok: true, data: await req.json() };
  } catch {
    return { ok: false };
  }
}

/** Drops the fields that live on the `Question` row, leaving only detail fields. */
function detailFields<T extends { questionType: unknown; difficultyId?: unknown }>(
  body: T,
): Omit<T, 'questionType' | 'difficultyId'> {
  const detail: Record<string, unknown> = { ...body };
  delete detail.questionType;
  delete detail.difficultyId;
  return detail as Omit<T, 'questionType' | 'difficultyId'>;
}

/* -------------------------------------- */
/*  Data access                                                               */
/* -------------------------------------------------------------------------- */

type Db = Prisma.TransactionClient;

function getQuestionDetail(db: Db, questionType: QuestionType, questionId: number) {
  const where = { questionId };

  switch (questionType) {
    case 'NAMING':
      return db.namingQuestion.findFirst({ where });
    case 'COMPREHENSION':
      return db.comprehensionQuestion.findFirst({ where });
    case 'COMPREHENSION_IMAGE':
      return db.comprehensionImageQuestion.findFirst({ where });
    case 'REPETITION':
      return db.repetitionQuestion.findFirst({ where });
    case 'SPONTANEOUS':
      return db.spontaneousQuestion.findFirst({ where });
  }
}

function createQuestionDetail(db: Db, questionId: number, body: CreateBody): Promise<object> {
  // `body` is already validated, trimmed and narrowed by `questionType`.
  switch (body.questionType) {
    case 'NAMING':
      return db.namingQuestion.create({ data: { questionId, ...detailFields(body) } });
    case 'COMPREHENSION_IMAGE':
      return db.comprehensionImageQuestion.create({ data: { questionId, ...detailFields(body) } });
    case 'COMPREHENSION':
      return db.comprehensionQuestion.create({ data: { questionId, ...detailFields(body) } });
    case 'REPETITION':
      return db.repetitionQuestion.create({ data: { questionId, ...detailFields(body) } });
    case 'SPONTANEOUS':
      return db.spontaneousQuestion.create({ data: { questionId, ...detailFields(body) } });
  }
}

function updateQuestionDetail(
  db: Db,
  questionType: QuestionType,
  questionId: number,
  data: DetailUpdate,
) {
  const args = { where: { questionId }, data };

  switch (questionType) {
    case 'NAMING':
      return db.namingQuestion.updateMany(args);
    case 'COMPREHENSION':
      return db.comprehensionQuestion.updateMany(args);
    case 'COMPREHENSION_IMAGE':
      return db.comprehensionImageQuestion.updateMany(args);
    case 'REPETITION':
      return db.repetitionQuestion.updateMany(args);
    case 'SPONTANEOUS':
      return db.spontaneousQuestion.updateMany(args);
  }
}

// Get question from questionId
export const GET = withAuth(['PATIENT', 'THERAPIST'], async (req: NextRequest) => {
  try {
    const questionId = getQuestionId(req);
    if (!questionId) return jsonError(INVALID_ID_ERROR, 400);

    const question = await prisma.question.findUnique({ where: { questionId } });
    if (!question) return jsonError('Question not found.', 404);

    const questionDetail = await getQuestionDetail(prisma, question.questionType, questionId);

    return NextResponse.json({
      data: {
        questionId: question.questionId,
        questionType: question.questionType,
        difficultyId: question.difficultyId,
        questionDetail,
      },
    });
  } catch (error) {
    console.error('Failed to get question by id:', error);
    return jsonError('Unable to get question.', 500);
  }
});

/* -------------------------------------------------------------------------- */
/*  POST /questions  (single object or array)                                 */
/* -------------------------------------------------------------------------- */
// Create new question(s)
export const POST = withAuth(['THERAPIST'], async (req: NextRequest) => {
  try {
    const json = await readJson(req);
    if (!json.ok) return jsonError(INVALID_JSON_ERROR, 400);

    const items: unknown[] = Array.isArray(json.data) ? json.data : [json.data];

    if (items.length === 0) {
      return jsonError('No questions provided for creation.', 400);
    }

    const bodies: CreateBody[] = [];
    const details: string[] = [];

    items.forEach((item, index) => {
      const parsed = CreateQuestionBody.safeParse(item);
      if (parsed.success) {
        bodies.push(parsed.data);
      } else {
        parsed.error.issues.forEach((issue) =>
          details.push(`Item [${index}]: ${formatIssue(issue)}`),
        );
      }
    });

    if (details.length > 0) {
      return jsonError('Validation failed.', 400, { details });
    }

    const created = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const body of bodies) {
        const question = await tx.question.create({
          data: { questionType: body.questionType, difficultyId: body.difficultyId ?? null },
        });
        const questionDetail = await createQuestionDetail(tx, question.questionId, body);

        results.push({ question, questionDetail });
      }

      return results;
    });

    return NextResponse.json(
      { message: `Successfully created ${created.length} question(s).`, data: created },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create question(s):', error);
    return jsonError('Unable to create question(s).', 500);
  }
});

/* -------------------------------------------------------------------------- */
/*  PATCH /questions?questionId=                                              */
/* -------------------------------------------------------------------------- */

export const PATCH = withAuth(['THERAPIST'], async (req: NextRequest) => {
  try {
    const questionId = getQuestionId(req);
    if (!questionId) return jsonError(INVALID_ID_ERROR, 400);

    const question = await prisma.question.findUnique({ where: { questionId } });
    if (!question) return jsonError('Question not found.', 404);

    const json = await readJson(req);
    if (!json.ok) return jsonError(INVALID_JSON_ERROR, 400);
    const rawBody = json.data;

    const envelope = PatchEnvelope.safeParse(rawBody);
    if (!envelope.success) {
      return jsonError(formatIssue(envelope.error.issues[0]), 400);
    }

    const { questionType: requestedType, difficultyId: newDifficultyId } = envelope.data;
    if (requestedType && requestedType !== question.questionType) {
      return jsonError(
        'Changing questionType is not supported in this edit endpoint. Update the existing question content only.',
        400,
      );
    }

    const detail = UPDATE_SCHEMAS[question.questionType].safeParse(rawBody);
    if (!detail.success) {
      return jsonError(formatIssue(detail.error.issues[0]), 400);
    }

    const detailUpdate: DetailUpdate = detail.data;
    const hasDetailUpdate = Object.keys(detailUpdate).length > 0;

    if (!hasDetailUpdate && newDifficultyId === undefined) {
      return jsonError('No question fields were provided to update.', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Bail out before writing anything if the detail row is missing,
      // so a partial update (e.g. difficultyId alone) is never committed.
      const existingDetail = await getQuestionDetail(tx, question.questionType, questionId);
      if (!existingDetail) return null;

      const updatedQuestion =
        newDifficultyId === undefined
          ? question
          : await tx.question.update({
            where: { questionId },
            data: { difficultyId: newDifficultyId },
          });

      if (hasDetailUpdate) {
        await updateQuestionDetail(tx, question.questionType, questionId, detailUpdate);
      }

      const questionDetail = await getQuestionDetail(tx, question.questionType, questionId);
      return { updatedQuestion, questionDetail };
    });

    if (!result) return jsonError('Question detail not found.', 404);

    const { updatedQuestion, questionDetail } = result;

    return NextResponse.json({
      message: 'Question updated successfully.',
      data: {
        questionId: updatedQuestion.questionId,
        questionType: updatedQuestion.questionType,
        difficultyId: updatedQuestion.difficultyId,
        questionDetail,
      },
    });
  } catch (error) {
    console.error('Failed to update question:', error);
    return jsonError('Unable to update question.', 500);
  }
});