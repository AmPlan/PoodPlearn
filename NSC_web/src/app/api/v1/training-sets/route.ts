import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // <-- Update this path to your db setup file
import { withAuth } from "@/lib/auth";

// GET all active training sets
export const GET = withAuth(["PATIENT", "THERAPIST"], async () => {
    try {
        const trainingSets = await prisma.trainingSet.findMany({
            where: {
                deletedAt: null,
                isStandardAssessment: false,
            },
            include: {
                category: true,
                difficultyLevel: true,
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(trainingSets, { status: 200 });
    } catch (error) {
        console.error("Error fetching training sets:", error);
        return NextResponse.json({ error: "Failed to fetch training sets" }, { status: 500 });
    }
});

// POST (Create) a new training set with questions
export const POST = withAuth(["THERAPIST"], async (request: NextRequest) => {
    try {
        const body = await request.json();

        // Notice we've added `questions` to the destructured body
        // Expected format: questions: [{ questionId: 1, orderIndex: 1 }, { questionId: 2, orderIndex: 2 }]
        const { categoryId, difficultyId, title, isStandardAssessment, questions } = body;

        if (!categoryId || !difficultyId || !title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newTrainingSet = await prisma.trainingSet.create({
            data: {
                categoryId: Number(categoryId),
                difficultyId: Number(difficultyId),
                title: String(title),
                isStandardAssessment: Boolean(isStandardAssessment ?? false),
                // If questions are provided, map through them and create the relationships
                ...(questions && Array.isArray(questions) && questions.length > 0 && {
                    setQuestions: {
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

        return NextResponse.json(newTrainingSet, { status: 201 });
    } catch (error) {
        console.error("Error creating training set:", error);
        return NextResponse.json({ error: "Failed to create training set" }, { status: 500 });
    }
});