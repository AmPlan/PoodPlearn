import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkHasFinishedAssessment(baseUrl: string, patientId: number) {
  const response = await fetch(`${baseUrl}/api/v1/assessments/has-finished?patientId=${patientId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-api-key': process.env.INTERNAL_API_SECRET! 
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as {
    hasFinishedAssessment?: boolean;
  };

  return payload.hasFinishedAssessment;
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const rawUserId = req.nextUrl.searchParams.get('userId');
    const targetUserId = rawUserId === null ? session.userId : Number(rawUserId);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: 'Invalid userId.' }, { status: 400 });
    }

    if (session.role !== 'THERAPIST' && session.userId !== targetUserId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const patient = await prisma.patient.findFirst({
      where: { userId: targetUserId },
      select: {
        patientId: true,
        patientFirstName: true,
        patientLastName: true,
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const hasFinishedAssessment = await checkHasFinishedAssessment(baseUrl, patient.patientId);    

    return NextResponse.json(
      {
        patient: {
          code: patient.patientId,
          name: patient.patientFirstName,
        },
        nextAction: hasFinishedAssessment
          ? {
              type: 'has_daily_training_plan',
              eyebrow: 'แผนการฝึกวันนี้',
              title: 'ฝึกตามแผนที่ระบบแนะนำ',
              description:
                'เริ่มจากแบบฝึกที่ระบบแนะนำตามผลการประเมินที่ผ่านมา',
              progressPercent: 0,
              buttonText: 'เริ่มฝึกวันนี้',
              targetPath: '/patient/training/today',
            }
          : {
              type: 'needs_standard_assessment',
            eyebrow: 'แบบทดสอบก่อนใช้งาน',
            title: 'ทำแบบทดสอบก่อนใช้งาน',
              description:
                'เริ่มต้นด้วยแบบทดสอบเพื่อให้ระบบวางแผนการฝึกที่เหมาะกับคุณ',
              progressPercent: 0,
              buttonText: 'เริ่มทำแบบทดสอบ',
              targetPath: '/patient/assessment/start',
            },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to load patient home data:', error);
    return NextResponse.json(
      { error: 'Unable to load patient home data.' },
      { status: 500 }
    );
  }
}
