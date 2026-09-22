import {  NextResponse } from 'next/server';
import { headers } from 'next/headers';

import { auth, withAuth } from '@/lib/auth';
import { Prisma, prisma } from '@/lib/prisma';
import { emailDomain, getEmail } from '@/lib/shared/utils/emailUtils';
import { ACCOUNT_REGEX, isValidGender } from '@/lib/shared/utils/patientDataUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CreatePatientBody = {
  account?: string;
  password?: string;
  patientFirstName?: string;
  patientLastName?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
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

type ParsedPatientBody = {
  account: string;
  password: string;
  patientFirstName: string;
  patientLastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: Date;
  occupation: string;
  province: string;
  note: string;
  caregiverFirstName: string;
  caregiverLastName: string;
  caregiverRelationship: string;
  caregiverTelephone: string;
  familyStatus: string;
  householdMembersCount: number;
  childrenCount: number;
  postcode: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------


const REQUIRED_FIELDS = [
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
  'postcode',
] as const;

const PATIENT_SELECT = {
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
      email: true,
      role: true,
      createdAt: true,
    },
  },
  // Last 5 completed sessions (endedAt not null), most recent first.
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
} satisfies Prisma.PatientSelect;

// ---------------------------------------------------------------------------
// GET /api/patients
// ---------------------------------------------------------------------------

function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(parseInt(searchParams.get('pageSize') ?? '20', 10) || 20, 1),
    100
  );
  return { page, pageSize };
}

function buildPatientWhere(search?: string): Prisma.PatientWhereInput {
  return {
    user: { deletedAt: null },
    ...(search
      ? {
        OR: [
          { patientFirstName: { contains: search, mode: 'insensitive' } },
          { patientLastName: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }
      : {}),
  };
}

/** Flattens a patient's nested sessionResults into a simple recentSessions array. */
function toPatientResponse(patient: Prisma.PatientGetPayload<{ select: typeof PATIENT_SELECT }>) {
  const { sessionResults, user, ...rest } = patient;

  return {
    ...rest,
    user: {
      ...user,
      account: user.email.replace(emailDomain, ''),
    },
    recentSessions: sessionResults
      .filter((result) => result.sessionCategoryResult !== null)
      .map((result) => ({
        sessionId: result.sessionId,
        ...result.sessionCategoryResult,
      })),
  };
}

// Returns all patients (therapist-only).
export const GET = withAuth(["THERAPIST"], async (req, _session) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const { page, pageSize } = parsePagination(searchParams);
    const where = buildPatientWhere(search);

    const [patients, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: PATIENT_SELECT,
      }),
      prisma.patient.count({ where }),
    ]);

    return NextResponse.json(
      {
        message: 'Patients retrieved successfully.',
        data: patients.map(toPatientResponse),
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
    return NextResponse.json({ error: 'Unable to fetch patients.' }, { status: 500 });
  }
})

// ---------------------------------------------------------------------------
// POST /api/patients
// ---------------------------------------------------------------------------

/** Returns the names of any required fields that are missing or blank. */
function findMissingFields(body: CreatePatientBody): string[] {
  return REQUIRED_FIELDS.filter((field) => {
    const value = body[field];
    return typeof value !== 'string' && typeof value !== 'number'
      ? true
      : String(value).trim() === '';
  });
}

/** Trims/coerces raw body fields and runs field-level validation. Returns either the parsed body or an error response. */
function parseAndValidateBody(
  body: CreatePatientBody
): { data: ParsedPatientBody; error: null } | { data: null; error: NextResponse } {
  const account = (body.account ?? '').trim();
  const gender = body.gender?.trim();
  const dateOfBirth = new Date((body.dateOfBirth ?? '').trim());
  const householdMembersCount =
    body.householdMembersCount === undefined
      ? 0
      : typeof body.householdMembersCount === 'number'
        ? body.householdMembersCount
        : Number(body.householdMembersCount);

  if (!ACCOUNT_REGEX.test(account)) {
    return { data: null, error: NextResponse.json({ error: 'Invalid account.' }, { status: 400 }) };
  }

  if (!isValidGender(gender)) {
    return {
      data: null,
      error: NextResponse.json({ error: 'Invalid gender. Use MALE, FEMALE, or OTHER.' }, { status: 400 }),
    };
  }

  if (Number.isNaN(dateOfBirth.getTime())) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Invalid dateOfBirth. Use a valid ISO date string.' },
        { status: 400 }
      ),
    };
  }

  if (!Number.isInteger(householdMembersCount) || householdMembersCount < 0) {
    return {
      data: null,
      error: NextResponse.json({ error: 'Invalid householdMembersCount.' }, { status: 400 }),
    };
  }

  return {
    data: {
      account,
      password: (body.password ?? '').trim(),
      patientFirstName: (body.patientFirstName ?? '').trim(),
      patientLastName: (body.patientLastName ?? '').trim(),
      gender,
      dateOfBirth,
      occupation: (body.occupation ?? '').trim(),
      province: (body.province ?? '').trim(),
      note: (body.note ?? '').trim(),
      caregiverFirstName: (body.caregiverFirstName ?? '').trim(),
      caregiverLastName: (body.caregiverLastName ?? '').trim(),
      caregiverRelationship: (body.caregiverRelationship ?? '').trim(),
      caregiverTelephone: (body.caregiverTelephone ?? '').trim(),
      familyStatus: (body.familyStatus ?? '').trim(),
      householdMembersCount,
      childrenCount: Number(body.childrenCount),
      postcode: body.postcode,
    },
    error: null,
  };
}

// Creates a new patient user (therapist-only).
export const POST = withAuth(["THERAPIST"], async(req, _session) => {
  let createdUserId: string | undefined;

  try {
    const body = (await req.json()) as CreatePatientBody;

    const missingFields = findMissingFields(body);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}.` },
        { status: 400 }
      );
    }

    const { data: patientInput, error: validationError } = parseAndValidateBody(body);
    if (validationError) return validationError;

    const existingUser = await prisma.user.findFirst({
      where: { email: getEmail(patientInput.account) },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this username already exists.' },
        { status: 409 }
      );
    }

    const userResult = await auth.api.createUser({
      body: {
        name: patientInput.account,
        email: getEmail(patientInput.account),
        password: patientInput.password,
      },
      headers: await headers(),
    });
    createdUserId = userResult.user.id;

    const patient = await prisma.patient.create({
      data: {
        userId: createdUserId,
        patientFirstName: patientInput.patientFirstName,
        patientLastName: patientInput.patientLastName,
        gender: patientInput.gender,
        dateOfBirth: patientInput.dateOfBirth,
        occupation: patientInput.occupation,
        province: patientInput.province,
        note: patientInput.note,
        caregiverFirstName: patientInput.caregiverFirstName,
        caregiverLastName: patientInput.caregiverLastName,
        caregiverRelationship: patientInput.caregiverRelationship,
        caregiverTelephone: patientInput.caregiverTelephone,
        familyStatus: patientInput.familyStatus,
        householdMembersCount: patientInput.householdMembersCount,
        childrenCount: patientInput.childrenCount,
        postcode: patientInput.postcode,
      },
    });

    return NextResponse.json(
      {
        message: 'Patient user created successfully.',
        user: {
          userId: userResult.user.id,
          account: patientInput.account,
          role: userResult.user.role,
          createdAt: userResult.user.createdAt,
          updatedAt: userResult.user.updatedAt,
        },
        patient: {
          ...patient,
          user: {
            account: patientInput.account,
            role: userResult.user.role,
            createdAt: userResult.user.createdAt,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch((cleanupError) => {
        console.error('Failed to clean up patient auth user:', cleanupError);
      });
    }

    console.error('Failed to create patient user:', error);
    return NextResponse.json({ error: 'Unable to create patient user.' }, { status: 500 });
  }
})