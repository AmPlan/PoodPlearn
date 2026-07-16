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
    const assessmentResultId = Number(id);

    if (!Number.isInteger(assessmentResultId) || assessmentResultId <= 0) {
        return NextResponse.json(
            { error: "Invalid assessment result id" },
            { status: 400 }
        );
    }

    const assessmentResult = await prisma.assessmentResult.findUnique({
        where: { assessmentResultId },
        include: {
            patient: true,
            trainingSet: true,
            assessmentItemResults: {
                orderBy: { assessmentItemResultId: "asc" },
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
    });

    if (!assessmentResult) {
        return NextResponse.json(
            { error: "Assessment result not found" },
            { status: 404 }
        );
    }

    // ---------- Build CSV ----------

    const header = [
        "assessment_result_id",
        "patient_id",
        "patient_name",
        "training_set_id",
        "training_set_title",
        "started_at",
        "ended_at",
        "assessment_item_result_id",
        "question_id",
        "question_type",
        "difficulty_level",
        "question_text",
        "expected_correct_answer",
        "patient_asr_text",
        "answer_boolean",
        "answer_image_url",
        "correctness",
        "response_time_sec",
        "is_correct",
        "item_created_at",
    ];

    const rows: string[] = [toCsvRow(header)];

    const patientName = `${assessmentResult.patient.patientFirstName} ${assessmentResult.patient.patientLastName}`;

    for (const item of assessmentResult.assessmentItemResults) {
        const question = item.question;
        const { questionText, correctAnswer } = extractQuestionContext(question);

        rows.push(
            toCsvRow([
                assessmentResult.assessmentResultId,
                assessmentResult.patientId,
                patientName,
                assessmentResult.setId,
                assessmentResult.trainingSet?.title ?? "",
                assessmentResult.startedAt.toISOString(),
                assessmentResult.endedAt ? assessmentResult.endedAt.toISOString() : "",
                item.assessmentItemResultId,
                question.questionId,
                question.questionType,
                question.difficultyLevel?.difficultyName ?? "",
                questionText,
                correctAnswer,
                item.asrText ?? "",
                item.answerBoolean === null || item.answerBoolean === undefined
                    ? ""
                    : item.answerBoolean
                        ? "TRUE"
                        : "FALSE",
                item.answerImageUrl ?? "",
                item.correctness ?? "",
                item.responseTime ?? "",
                item.isCorrect ? "TRUE" : "FALSE",
                item.createdAt.toISOString(),
            ])
        );
    }

    // Prepend UTF-8 BOM so Excel opens non-ASCII text (e.g. Thai) correctly
    const csvContent = "\uFEFF" + rows.join("\r\n");

    const filename = `assessment-result-${assessmentResultId}.csv`;

    return new NextResponse(csvContent, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}