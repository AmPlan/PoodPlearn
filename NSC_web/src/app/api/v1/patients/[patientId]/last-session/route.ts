import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type DailyPlanContext = {
    params: { patientId: string } | Promise<{ patientId: string }>;
};

export async function GET(req: NextRequest, context: DailyPlanContext) {
    try {
        const cookieStore = await cookies();
        const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
        }

        const params = await context.params;
        const patientId = Number(params.patientId);

        if (!Number.isInteger(patientId) || patientId <= 0) {
            return NextResponse.json({ error: 'Invalid patientId.' }, { status: 400 });
        }

        if (session.role !== 'THERAPIST' && session.patientId !== patientId) {
            return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
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
}

