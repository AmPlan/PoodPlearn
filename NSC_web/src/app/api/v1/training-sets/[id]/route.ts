import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // <-- Update this path
import { AuthSession, withAuth } from "@/lib/auth";

// GET a specific training set by ID (with full question data)
export const GET = withAuth(["PATIENT", "THERAPIST"], async (
  _request: NextRequest,
  _session: AuthSession,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const resolvedParams = await params;
    const setId = Number(resolvedParams.id);

    if (isNaN(setId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const trainingSet = await prisma.trainingSet.findUnique({
      where: { 
        setId: setId 
      },
      include: {
        category: true,
        difficultyLevel: true,
        setQuestions: {
          orderBy: {
            orderIndex: "asc",
          },
          include: {
            question: {
              include: {
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

    if (!trainingSet) {
      return NextResponse.json({ error: "Training set not found" }, { status: 404 });
    }

    return NextResponse.json(trainingSet, { status: 200 });

  } catch (error) {
    console.error("Error fetching training set:", error);
    return NextResponse.json({ error: "Failed to fetch training set" }, { status: 500 });
  }
});
// PATCH (Edit) a specific training set and update its questions
export const PATCH = withAuth(["THERAPIST"], async (
    request: NextRequest,
    _session: AuthSession,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const resolvedParams = await params;
        const setId = Number(resolvedParams.id);

        if (isNaN(setId)) {
            return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
        }
        const body = await request.json();

        // Extracted fields, now including `questions`
        const { categoryId, difficultyId, title, isStandardAssessment, questions } = body;

        const existingSet = await prisma.trainingSet.findUnique({ where: { setId } });
        if (!existingSet || existingSet.deletedAt) {
            return NextResponse.json({ error: "Training set not found" }, { status: 404 });
        }

        const updatedTrainingSet = await prisma.trainingSet.update({
            where: { setId },
            data: {
                ...(categoryId && { categoryId: Number(categoryId) }),
                ...(difficultyId && { difficultyId: Number(difficultyId) }),
                ...(title && { title: String(title) }),
                ...(isStandardAssessment !== undefined && { isStandardAssessment: Boolean(isStandardAssessment) }),

                // If a new questions array is passed, replace the old ones entirely
                ...(questions && Array.isArray(questions) && {
                    setQuestions: {
                        deleteMany: {}, // Wipes the existing questions for this set
                        create: questions.map((q: any) => ({
                            questionId: Number(q.questionId),
                            orderIndex: Number(q.orderIndex),
                        })),
                    },
                }),
            },
            include: {
                category: true,
                difficultyLevel: true,
                setQuestions: {
                    include: { question: true }
                }
            }
        });

        return NextResponse.json(updatedTrainingSet, { status: 200 });
    } catch (error) {
        console.error("Error updating training set:", error);
        return NextResponse.json({ error: "Failed to update training set" }, { status: 500 });
    }
});
// DELETE (Soft Delete) a specific training set
export const DELETE = withAuth(["THERAPIST"], async (
    _request: NextRequest,
    _session: AuthSession,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const resolvedParams = await params;
        const setId = Number(resolvedParams.id);

        if (isNaN(setId)) {
            return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
        }

        const deletedTrainingSet = await prisma.trainingSet.update({
            where: { setId },
            data: {
                deletedAt: new Date(),
            },
        });

        return NextResponse.json(deletedTrainingSet, { status: 200 });
    } catch (error) {
        console.error("Error deleting training set:", error);
        return NextResponse.json({ error: "Failed to delete training set" }, { status: 500 });
    }
});