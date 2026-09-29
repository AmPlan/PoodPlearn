import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { AuthSession, withAuth } from '@/lib/auth';
import { checkPatientPermission } from '@/lib/server/utils/patientUtils';

type DailyPlanContext = {
    params: { patientId: string } | Promise<{ patientId: string }>;
};

export const GET = withAuth(['PATIENT', 'THERAPIST'], async (
    _req: NextRequest,
    session: AuthSession,
    context: DailyPlanContext
) => {
    try {
        const params = await context.params;
        const patientId = Number(params.patientId);

        if (!Number.isInteger(patientId) || patientId <= 0) {
            return NextResponse.json({ error: 'Invalid patientId.' }, { status: 400 });
        }

        const permission = await checkPatientPermission(session, patientId);
        if (permission !== true) {
            return permission;
        }

        const sessionCategoryResult = await prisma.sessionCategoryResult.findFirst({
            where: {
                sessionResult: {
                    patientId,
                },
            },
            include: {
                sessionResult: true,
                trainingSet: true,
            },
            orderBy: {
                startedAt: 'desc',
            },
        });

        if (!sessionCategoryResult) {
            return NextResponse.json({ error: 'Last session not found.' }, { status: 404 });
        }

        return NextResponse.json({ data: sessionCategoryResult }, { status: 200 });
    } catch (error) {
        console.error('Failed to get last session:', error);
        return NextResponse.json(
            { error: 'Unable to fetch last session.' },
            { status: 500 }
        );
    }
});
