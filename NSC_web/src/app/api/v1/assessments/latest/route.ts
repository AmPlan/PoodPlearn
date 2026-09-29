import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { checkPatientPermission } from '@/lib/server/utils/patientUtils';

export const GET = withAuth(['PATIENT', 'THERAPIST'], async (req: NextRequest, session) => {
    try {
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

        const permission = await checkPatientPermission(session, patient.patientId);
        if (permission !== true) {
            return permission;
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
});