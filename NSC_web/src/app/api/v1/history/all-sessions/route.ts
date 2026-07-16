import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);

        const patientIdParam = searchParams.get('patientId');
        const patientId = patientIdParam ? Number(patientIdParam) : undefined;

        if (patientIdParam && Number.isNaN(patientId)) {
            return NextResponse.json(
                { error: 'patientId must be a number.' },
                { status: 400 }
            );
        }

        let limit = 10;
        const limitParam = searchParams.get('limit');

        if (limitParam) {
            const parsed = Number(limitParam);

            if (Number.isNaN(parsed) || parsed <= 0) {
                return NextResponse.json(
                    { error: 'limit must be a positive number.' },
                    { status: 400 }
                );
            }

            limit = Math.min(parsed, 100);
        }

        if (session.role !== 'THERAPIST') {
            if (patientId && patientId !== session.patientId) {
                return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
            }
        }

        const effectivePatientId =
            session.role === 'THERAPIST'
                ? patientId
                : session.patientId;

        const [sessions, assessments] = await Promise.all([
            prisma.sessionResult.findMany({
                where: {
                    ...(effectivePatientId ? { patientId: effectivePatientId } : {}),
                    sessionCategoryResult: {
                        endedAt: { not: null },
                    },
                },
                include: {
                    patient: {
                        select: {
                            patientId: true,
                            patientFirstName: true,
                            patientLastName: true,
                        },
                    },
                    sessionCategoryResult: {
                        include: {
                            trainingSet: true,
                        },
                    },
                },
            }),

            prisma.assessmentResult.findMany({
                where: {
                    ...(effectivePatientId ? { patientId: effectivePatientId } : {}),
                    endedAt: { not: null },
                },
                include: {
                    patient: {
                        select: {
                            patientId: true,
                            patientFirstName: true,
                            patientLastName: true,
                        },
                    },
                    trainingSet: true,
                },
            }),
        ]);

        const history = [
            ...sessions.map((s) => ({
                type: 'SESSION',
                endedAt: s.sessionCategoryResult?.endedAt,
                data: s,
            })),

            ...assessments.map((a) => ({
                type: 'ASSESSMENT',
                endedAt: a.endedAt,
                data: a,
            })),
        ]
            .sort(
                (a, b) =>
                    new Date(b.endedAt!).getTime() -
                    new Date(a.endedAt!).getTime()
            )
            .slice(0, limit);

        return NextResponse.json(
            {
                message: 'History fetched successfully.',
                data: history,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Failed to fetch history:', error);

        return NextResponse.json(
            { error: 'Unable to fetch history.' },
            { status: 500 }
        );
    }
}