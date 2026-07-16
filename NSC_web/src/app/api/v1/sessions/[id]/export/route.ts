import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust import path to match your project (this uses the prisma.ts you uploaded)

// ---------- Types ----------

type QuestionContext = {
    questionText: string;
    correctAnswer: string;
};

// ---------- Helpers ----------

/**
 * Each QuestionType stores its own "context" (text, correct answer, etc.)
 * in a different table. This pulls out a normalized {questionText, correctAnswer}
 * regardless of which type the question is.
 */
function extractQuestionContext(question: any): QuestionContext {
    switch (question.questionType) {
        case "NAMING": {
            const q = question.namingQuestions?.[0];
            return {
                questionText: q ? `[Name this image] ${q.imageUrl}` : "",
                correctAnswer: q?.correctAnswer ?? "",
            };
        }
        case "COMPREHENSION_IMAGE": {
            const q = question.comprehensionImageQuestions?.[0];
            return {
                questionText: q?.questionText ?? "",
                correctAnswer: q?.correctImageUrl ?? "",
            };
        }
        case "COMPREHENSION": {
            const q = question.ComprehensionQuestion?.[0];
            return {
                questionText: q?.questionText ?? "",
                correctAnswer:
                    q?.correctAnswer === null || q?.correctAnswer === undefined
                        ? ""
                        : String(q.correctAnswer),
            };
        }
        case "REPETITION": {
            const q = question.repetitionQuestions?.[0];
            return {
                questionText: q?.text ?? "",
                correctAnswer: q?.text ?? "",
            };
        }
        case "SPONTANEOUS": {
            const q = question.spontaneousQuestions?.[0];
            return {
                questionText: q?.questionText ?? "",
                correctAnswer: q?.correctAnswer ?? "",
            };
        }
        default:
            return { questionText: "", correctAnswer: "" };
    }
}

/** Escapes a single CSV field per RFC 4180 */
function csvEscape(value: unknown): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function toCsvRow(values: unknown[]): string {
    return values.map(csvEscape).join(",");
}

// ---------- Route ----------

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const sessionId = Number(id);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
        return NextResponse.json(
            { error: "Invalid session result id" },
            { status: 400 }
        );
    }

    const sessionResult = await prisma.sessionResult.findUnique({
        where: { sessionId },
        include: {
            patient: true,
            sessionCategoryResult: {
                include: {
                    trainingSet: true,
                    sessionItemResults: {
                        orderBy: { sessionItemId: "asc" },
                        include: {
                            question: {
                                include: {
                                    difficultyLevel: true,
                                    namingQuestions: true,
                                    comprehensionImageQuestions: true,
                                    ComprehensionQuestion: true,
                                    repetitionQuestions: true,
                                    spontaneousQuestions: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!sessionResult) {
        return NextResponse.json(
            { error: "Session result not found" },
            { status: 404 }
        );
    }

    if (!sessionResult.sessionCategoryResult) {
        return NextResponse.json(
            { error: "Session result has no category result data" },
            { status: 404 }
        );
    }

    // ---------- Build CSV ----------

    const header = [
        "session_id",
        "patient_id",
        "patient_name",
        "training_set_id",
        "training_set_title",
        "session_category_id",
        "total_score",
        "average_response_time",
        "average_hint_used",
        "started_at",
        "ended_at",
        "session_item_id",
        "question_id",
        "question_type",
        "difficulty_level",
        "question_text",
        "expected_correct_answer",
        "patient_asr_text",
        "hints_used",
        "answer_boolean",
        "answer_image_url",
        "correctness",
        "score",
        "response_time_sec",
        "item_created_at",
        "stt_model",
        "file_name",
    ];

    const rows: string[] = [toCsvRow(header)];

    const patientName = `${sessionResult.patient.patientFirstName} ${sessionResult.patient.patientLastName}`;
    const categoryResult = sessionResult.sessionCategoryResult;

    for (const item of categoryResult.sessionItemResults) {
        const question = item.question;
        const { questionText, correctAnswer } = extractQuestionContext(question);

        rows.push(
            toCsvRow([
                sessionResult.sessionId,
                sessionResult.patientId,
                patientName,
                categoryResult.setId,
                categoryResult.trainingSet?.title ?? "",
                categoryResult.sessionCategoryId,
                categoryResult.totalScore,
                categoryResult.averageResponseTime,
                categoryResult.averageHintUsed,
                categoryResult.startedAt.toISOString(),
                categoryResult.endedAt ? categoryResult.endedAt.toISOString() : "",
                item.sessionItemId,
                question.questionId,
                question.questionType,
                question.difficultyLevel?.difficultyName ?? "",
                questionText,
                correctAnswer,
                item.asrText ?? "",
                item.hintsUsed === null || item.hintsUsed === undefined
                    ? ""
                    : item.hintsUsed,
                item.answerBoolean === null || item.answerBoolean === undefined
                    ? ""
                    : item.answerBoolean
                        ? "TRUE"
                        : "FALSE",
                item.answerImageUrl ?? "",
                item.correctness ?? "",
                item.score,
                item.responseTime,
                item.createdAt.toISOString(),
                item.sttModel,
                item.audioFileName
            ])
        );
    }

    // Prepend UTF-8 BOM so Excel opens non-ASCII text (e.g. Thai) correctly
    const csvContent = "\uFEFF" + rows.join("\r\n");

    const filename = `session-result-${sessionId}.csv`;

    return new NextResponse(csvContent, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}