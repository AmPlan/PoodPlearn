import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/auth';
import { checkPatientPermission, getPatientId } from '@/lib/server/utils/patientUtils';
import { prisma } from '@/lib/prisma';

export const GET = withAuth(['PATIENT', 'THERAPIST'], async (req: NextRequest, session) => {
    try {
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

        const isPrivileged = session.user.role === 'THERAPIST' || session.user.role === 'ADMIN';
        if (patientId) {
            const permission = await checkPatientPermission(session, patientId);
            if (permission !== true) {
                return permission;
            }
        }

        const ownPatientId = isPrivileged ? undefined : await getPatientId(session);
        if (!isPrivileged && ownPatientId === undefined) {
            return NextResponse.json({ error: 'Patient profile not found.' }, { status: 404 });
        }
        const effectivePatientId = isPrivileged ? patientId : ownPatientId;

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
});