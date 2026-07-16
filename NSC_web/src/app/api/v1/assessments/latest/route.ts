import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
        }

        const rawPatientId = req.nextUrl.searchParams.get('patientId');
        const targetPatientId = Number(rawPatientId);

        if (!Number.isInteger(targetPatientId) || targetPatientId <= 0) {
            return NextResponse.json({ error: 'Invalid patientId.' }, { status: 400 });
        }

        const patient = await prisma.patient.findUnique({
            where: { patientId: targetPatientId },
            select: { patientId: true, userId: true },
        });

        if (!patient) {
            return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
        }

        if (session.role !== 'THERAPIST' && session.userId !== patient.userId) {
            return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
        }
        
        const lastAssessment = await prisma.assessmentResult.findFirst({
            where: {
                patientId: patient.patientId,
                endedAt: {
                    not: null
                }
            },
            orderBy: { startedAt: 'desc' },
            include: {
                trainingSet: {
                    select: {
                        setId: true,
                        title: true,
                        isStandardAssessment: true,
                    },
                },
                assessmentCategoryResults: {
                    include: {
                        category: {
                            select: {
                                categoryId: true,
                                categoryName: true,
                            },
                        },
                        recommendedDifficulty: {
                            select: {
                                difficultyId: true,
                                difficultyLevel: true,
                                difficultyName: true,
                            },
                        },
                        
                    },
                },
            },
        });

        lastAssessment?.endedAt

        if (!lastAssessment) {
            return NextResponse.json(
                { assessment: null },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { assessment: lastAssessment },
            { status: 200 }
        );
    } catch (error) {
        console.error('Failed to fetch last assessment:', error);
        return NextResponse.json(
            { error: 'Unable to fetch last assessment.' },
            { status: 500 }
        );
    }
}