import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_COOKIE_NAME, verifySession } from '@/lib/auth';
import { Prisma, prisma } from '@/lib/prisma';

type CreatePatientBody = {
  account?: string;
  password?: string;
  patientFirstName?: string;
  patientLastName?: string;
  gender?: 'MALE' | 'FEMALE' | "OTHER";
  dateOfBirth?: string;
  occupation?: string;
  province?: string;
  note?: string;
  caregiverFirstName?: string;
  caregiverLastName?: string;
  caregiverRelationship?: string;
  caregiverTelephone?: string;
  familyStatus: string;
  householdMembersCount?: number | string;
  childrenCount: string;
  postcode: string;
};



const accountRegex = /^P-\d{6}$/;

const requiredFields = [
  'account',
  'password',
  'patientFirstName',
  'patientLastName',
  'gender',
  'dateOfBirth',
  'occupation',
  'province',
  'caregiverFirstName',
  'caregiverLastName',
  'caregiverRelationship',
  'caregiverTelephone',
  'familyStatus',
  'childrenCount',
  'postcode'
] as const;

function isValidGender(value: string | undefined): value is 'MALE' | 'FEMALE' | 'OTHER' {
  return value === 'MALE' || value === 'FEMALE' || value === 'OTHER';
}


// ==========================================
// GET /api/patients
// Returns all patients (therapist-only).
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (session.role !== 'THERAPIST') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // Optional query params for simple search/pagination.
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');

    const page = pageParam ? Math.max(parseInt(pageParam, 10) || 1, 1) : 1;
    const pageSize = pageSizeParam
      ? Math.min(Math.max(parseInt(pageSizeParam, 10) || 20, 1), 100)
      : 20;

    const where: Prisma.PatientWhereInput = {
      user: { deletedAt: null },
      ...(search
        ? {
          OR: [
            { patientFirstName: { contains: search, mode: 'insensitive' } },
            { patientLastName: { contains: search, mode: 'insensitive' } },
            { user: { account: { contains: search, mode: 'insensitive' } } },
          ],
        }
        : {}),
    };

    const [patients, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          patientId: true,
          userId: true,
          patientFirstName: true,
          patientLastName: true,
          gender: true,
          dateOfBirth: true,
          occupation: true,
          province: true,
          note: true,
          caregiverFirstName: true,
          caregiverLastName: true,
          caregiverRelationship: true,
          caregiverTelephone: true,
          householdMembersCount: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              account: true,
              role: true,
              createdAt: true,
            },
          },
          // Last 5 completed sessions (endedAt not null), most recent first
          sessionResults: {
            where: {
              sessionCategoryResult: {
                endedAt: { not: null },
              },
            },
            orderBy: {
              sessionCategoryResult: {
                endedAt: 'desc',
              },
            },
            take: 5,
            select: {
              sessionId: true,
              sessionCategoryResult: {
                select: {
                  sessionCategoryId: true,
                  setId: true,
                  totalScore: true,
                  averageResponseTime: true,
                  averageHintUsed: true,
                  startedAt: true,
                  endedAt: true,
                  trainingSet: {
                    select: {
                      title: true,
                      categoryId: true,
                      difficultyId: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    // Flatten each patient's sessionResults into a clean recentSessions array
    const patientsWithRecentSessions = patients.map((patient) => {
      const { sessionResults, ...rest } = patient;
      return {
        ...rest,
        recentSessions: sessionResults
          .filter((sr) => sr.sessionCategoryResult !== null)
          .map((sr) => ({
            sessionId: sr.sessionId,
            ...sr.sessionCategoryResult,
          })),
      };
    });

    return NextResponse.json(
      {
        message: 'Patients retrieved successfully.',
        data: patientsWithRecentSessions,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      { status: 200 }
    );
    } catch (error) {
    console.error('Failed to fetch patients:', error);
    return NextResponse.json(
      { error: 'Unable to fetch patients.' },
      { status: 500 }
    );
  }
}

// ==========================================
// POST /api/patients
// Creates a new patient user (therapist-only).
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (session.role !== 'THERAPIST') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = (await req.json()) as CreatePatientBody;

    const missingFields = requiredFields.filter((field) => {
      const value = String(body[field]);
      return typeof value !== 'string' || value.trim() === '';
    });

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}.` },
        { status: 400 }
      );
    }

    const safeBody = body as Required<CreatePatientBody>;

    const account = safeBody.account.trim();
    const password = safeBody.password.trim();
    const patientFirstName = safeBody.patientFirstName.trim();
    const patientLastName = safeBody.patientLastName.trim();
    const gender = safeBody.gender?.trim();
    const dateOfBirth = new Date(safeBody.dateOfBirth.trim());
    const occupation = safeBody.occupation.trim();
    const province = safeBody.province.trim();
    const note = safeBody.note.trim();
    const caregiverFirstName = safeBody.caregiverFirstName.trim();
    const caregiverLastName = safeBody.caregiverLastName.trim();
    const caregiverRelationship = safeBody.caregiverRelationship.trim();
    const caregiverTelephone = safeBody.caregiverTelephone.trim();
    const familyStatus = safeBody.familyStatus.trim();
    const householdMembersCount =
      safeBody.householdMembersCount === undefined
        ? 0
        : typeof safeBody.householdMembersCount === 'number'
          ? safeBody.householdMembersCount
          : Number(safeBody.householdMembersCount);
    const childrenCount = Number(safeBody.childrenCount);
    const postcode = safeBody.postcode;


    if (!accountRegex.test(account)) {
      return NextResponse.json(
        { error: 'Invalid account.' },
        { status: 400 }
      );

    }

    if (!isValidGender(gender)) {
      return NextResponse.json(
        { error: 'Invalid gender. Use MALE or FEMALE.' },
        { status: 400 }
      );
    }

    if (Number.isNaN(dateOfBirth.getTime())) {
      return NextResponse.json(
        { error: 'Invalid dateOfBirth. Use a valid ISO date string.' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(householdMembersCount) || householdMembersCount < 0) {
      return NextResponse.json(
        { error: 'Invalid householdMembersCount.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { account },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this username already exists.' },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          account,
          password,
          role: 'PATIENT',
        },
      });

      const patient = await tx.patient.create({
        data: {
          userId: user.userId,
          patientFirstName,
          patientLastName,
          gender,
          dateOfBirth,
          occupation,
          province,
          note,
          caregiverFirstName,
          caregiverLastName,
          caregiverRelationship,
          caregiverTelephone,
          familyStatus,
          householdMembersCount,
          childrenCount,
          postcode,
        },
      });

      return { user, patient };
    });

    return NextResponse.json(
      {
        message: 'Patient user created successfully.',
        user: result.user,
        patient: result.patient,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create patient user:', error);
    return NextResponse.json(
      { error: 'Unable to create patient user.' },
      { status: 500 }
    );
  }
}