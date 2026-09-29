import { NextRequest, NextResponse } from 'next/server';

import { Prisma, prisma } from '@/lib/prisma';
import { auth, AuthSession, withAuth } from '@/lib/auth';
import { checkPatientPermission } from '@/lib/server/utils/patientUtils';
import { getEmail } from '@/lib/shared/utils/emailUtils';

type PatientRouteContext = {
  params: { patientId: string } | Promise<{ patientId: string }>;
};

type UpdatePatientBody = {
  account?: string;
  password?: string;
  patientFirstName?: string;
  patientLastName?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  occupation?: string;
  province?: string;
  note?: string | null;
  caregiverFirstName?: string;
  caregiverLastName?: string;
  caregiverRelationship?: string;
  caregiverTelephone?: string | null;
  familyStatus?: string | null;
  householdMembersCount?: number | string | null;
  childrenCount?: number | string | null;
  postcode?: string | null;
};

const accountRegex = /^HN\d{6}$/;

function isValidGender(value: string | undefined): value is 'MALE' | 'FEMALE' | 'OTHER' {
  return value === 'MALE' || value === 'FEMALE' || value === 'OTHER';
}

function parsePatientId(value: string) {
  const patientId = Number(value);

  return Number.isInteger(patientId) && patientId > 0 ? patientId : null;
}

function requireText(value: unknown, fieldName: string) {
  if (typeof value !== 'string') {
    return { error: `${fieldName} is required.` };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return { error: `${fieldName} is required.` };
  }

  return { value: trimmed };
}

async function getCurrentPatient(patientId: number) {
  return prisma.patient.findFirst({
    where: { patientId, user: { deletedAt: null } },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

function toPatientResponse<T extends { user: { id: string; email: string; role: string; createdAt: Date; updatedAt: Date } }>(
  patient: T
) {
  const { user, ...patientData } = patient;
  return {
    ...patientData,
    user: {
      userId: user.id,
      account: user.email.replace(/@local\.internal$/, ''),
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

async function getPatientWithRecentSessions(patientId: number) {
  return prisma.patient.findFirst({
		where: { patientId, user: { deletedAt: null } },
		include: {
			user: {
				select: {
					id: true,
					email: true,
					role: true,
					createdAt: true,
					updatedAt: true,
				},
			},
			sessionResults: {
				where: {
					sessionCategoryResult: {
						endedAt: { not: null },
					},
				},
				orderBy: {
					sessionCategoryResult: {
						endedAt: "desc",
					},
				},
				include: {
					sessionCategoryResult: {
						include: {
							trainingSet: true,
						},
					},
				},
			},
		},
  });
}
export const GET = withAuth(['PATIENT', 'THERAPIST'], async (
  _req: NextRequest,
  session: AuthSession,
  context: PatientRouteContext
) => {
  try {
    const params = await context.params;
    const patientId = parsePatientId(params.patientId);

    if (!patientId) {
      return NextResponse.json({ error: 'Invalid patientId.' }, { status: 400 });
    }

    const permission = await checkPatientPermission(session, patientId);
    if (permission !== true) {
      return permission;
    }

    const patient = await getPatientWithRecentSessions(patientId);

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    const { sessionResults, ...rest } = patient;
    const patientWithRecentSessions = {
      ...rest,
      recentSessions: sessionResults
        .filter((sr) => sr.sessionCategoryResult !== null)
        .map((sr) => ({
          sessionId: sr.sessionId,
          ...sr.sessionCategoryResult,
        })),
    };

    return NextResponse.json({
      patient: {
        ...toPatientResponse(patientWithRecentSessions),
        recentSessions: patientWithRecentSessions.recentSessions,
      },
    });
  } catch (error) {
    console.error('Failed to load patient:', error);
    return NextResponse.json({ error: 'Unable to load patient.' }, { status: 500 });
  }
});

export const PATCH = withAuth(['PATIENT', 'THERAPIST'], async (
  req: NextRequest,
  session: AuthSession,
  context: PatientRouteContext
) => {
  try {
    const params = await context.params;
    const patientId = parsePatientId(params.patientId);

    if (!patientId) {
      return NextResponse.json({ error: 'Invalid patientId.' }, { status: 400 });
    }

    const currentPatient = await getCurrentPatient(patientId);

    if (!currentPatient) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    const permission = await checkPatientPermission(session, patientId);
    if (permission !== true) {
      return permission;
    }

    const body = (await req.json()) as UpdatePatientBody;

    const patientData: Prisma.PatientUpdateInput = {};
    let updatedAccount: string | undefined;
    let updatedPassword: string | undefined;

    if (body.account !== undefined) {
      const account = requireText(body.account, 'account');

      if ('error' in account) {
        return NextResponse.json({ error: account.error }, { status: 400 });
      }

      if (!accountRegex.test(account.value)) {
        return NextResponse.json({ error: 'Invalid account.' }, { status: 400 });
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          email: getEmail(account.value),
          NOT: {
            id: currentPatient.user.id,
          },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this username already exists.' },
          { status: 409 }
        );
      }

      updatedAccount = account.value;
    }

    if (body.password !== undefined) {
      const password = requireText(body.password, 'password');

      if ('error' in password) {
        return NextResponse.json({ error: password.error }, { status: 400 });
      }

      updatedPassword = password.value;
    }

    if (body.patientFirstName !== undefined) {
      const value = requireText(body.patientFirstName, 'patientFirstName');

      if ('error' in value) {
        return NextResponse.json({ error: value.error }, { status: 400 });
      }

      patientData.patientFirstName = value.value;
    }

    if (body.patientLastName !== undefined) {
      const value = requireText(body.patientLastName, 'patientLastName');

      if ('error' in value) {
        return NextResponse.json({ error: value.error }, { status: 400 });
      }

      patientData.patientLastName = value.value;
    }

    if (body.gender !== undefined) {
      const gender = typeof body.gender === 'string' ? body.gender.trim() : undefined;

      if (!isValidGender(gender)) {
        return NextResponse.json(
          { error: 'Invalid gender. Use MALE or FEMALE.' },
          { status: 400 }
        );
      }

      patientData.gender = gender;
    }

    if (body.dateOfBirth !== undefined) {
      const dateOfBirth = new Date(body.dateOfBirth.trim());

      if (Number.isNaN(dateOfBirth.getTime())) {
        return NextResponse.json(
          { error: 'Invalid dateOfBirth. Use a valid ISO date string.' },
          { status: 400 }
        );
      }

      patientData.dateOfBirth = dateOfBirth;
    }

    if (body.occupation !== undefined) {
      const value = requireText(body.occupation, 'occupation');

      if ('error' in value) {
        return NextResponse.json({ error: value.error }, { status: 400 });
      }

      patientData.occupation = value.value;
    }

    if (body.province !== undefined) {
      const value = requireText(body.province, 'province');

      if ('error' in value) {
        return NextResponse.json({ error: value.error }, { status: 400 });
      }

      patientData.province = value.value;
    }

    if (body.note !== undefined) {
      if (body.note === null) {
        patientData.note = null;
      } else if (typeof body.note === 'string') {
        patientData.note = body.note.trim() || null;
      } else {
        return NextResponse.json({ error: 'Invalid note.' }, { status: 400 });
      }
    }

    if (body.caregiverFirstName !== undefined) {
      const value = requireText(body.caregiverFirstName, 'caregiverFirstName');

      if ('error' in value) {
        return NextResponse.json({ error: value.error }, { status: 400 });
      }

      patientData.caregiverFirstName = value.value;
    }

    if (body.caregiverLastName !== undefined) {
      const value = requireText(body.caregiverLastName, 'caregiverLastName');

      if ('error' in value) {
        return NextResponse.json({ error: value.error }, { status: 400 });
      }

      patientData.caregiverLastName = value.value;
    }

    if (body.caregiverRelationship !== undefined) {
      const value = requireText(body.caregiverRelationship, 'caregiverRelationship');

      if ('error' in value) {
        return NextResponse.json({ error: value.error }, { status: 400 });
      }

      patientData.caregiverRelationship = value.value;
    }

    if (body.caregiverTelephone !== undefined) {
      if (body.caregiverTelephone === null) {
        patientData.caregiverTelephone = null;
      } else if (typeof body.caregiverTelephone === 'string') {
        patientData.caregiverTelephone = body.caregiverTelephone.trim() || null;
      } else {
        return NextResponse.json({ error: 'Invalid caregiverTelephone.' }, { status: 400 });
      }
    }

    if (body.familyStatus !== undefined) {
      if (body.familyStatus === null) {
        patientData.familyStatus = null;
      } else if (typeof body.familyStatus === 'string') {
        patientData.familyStatus = body.familyStatus.trim() || null;
      } else {
        return NextResponse.json({ error: 'Invalid familyStatus.' }, { status: 400 });
      }
    }

    // --- Household Members Count ---
    if (body.householdMembersCount !== undefined) {
      if (body.householdMembersCount === null || body.householdMembersCount === '') {
        patientData.householdMembersCount = 0; // or null, depending on what you want
      } else if (typeof body.householdMembersCount === 'number') {
        if (!Number.isInteger(body.householdMembersCount) || body.householdMembersCount < 0) {
          return NextResponse.json({ error: 'Invalid householdMembersCount.' }, { status: 400 });
        }
        patientData.householdMembersCount = body.householdMembersCount;
      } else if (typeof body.householdMembersCount === 'string') {
        const trimmed = body.householdMembersCount.trim();
        const parsed = Number(trimmed);

        // Catch strings that aren't numbers (like "abc") which parse to NaN
        if (trimmed === '' || Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
          return NextResponse.json({ error: 'Invalid householdMembersCount.' }, { status: 400 });
        }
        patientData.householdMembersCount = parsed;
      } else {
        return NextResponse.json({ error: 'Invalid householdMembersCount.' }, { status: 400 });
      }
    }

    // --- Children Count ---
    if (body.childrenCount !== undefined) {
      if (body.childrenCount === null || body.childrenCount === '') {
        patientData.childrenCount = 0; // or null
      } else if (typeof body.childrenCount === 'number') {
        // Note: You were missing the integer/negative check here in your original code
        if (!Number.isInteger(body.childrenCount) || body.childrenCount < 0) {
          return NextResponse.json({ error: 'Invalid childrenCount.' }, { status: 400 });
        }
        patientData.childrenCount = body.childrenCount;
      } else if (typeof body.childrenCount === 'string') {
        const trimmed = body.childrenCount.trim();
        const parsed = Number(trimmed);

        if (trimmed === '' || Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
          return NextResponse.json({ error: 'Invalid childrenCount.' }, { status: 400 });
        }
        patientData.childrenCount = parsed;
      } else {
        return NextResponse.json({ error: 'Invalid childrenCount.' }, { status: 400 });
      }
    }
    if (body.postcode !== undefined) {
      if (body.postcode === null) {
        patientData.postcode = null;
      } else if (typeof body.postcode === 'string') {
        patientData.postcode = body.postcode.trim() || null;
      } else {
        return NextResponse.json({ error: 'Invalid postcode.' }, { status: 400 });
      }
    }

    if (
      updatedAccount === undefined &&
      updatedPassword === undefined &&
      Object.keys(patientData).length === 0
    ) {
      return NextResponse.json(
        { error: 'No patient fields were provided to update.' },
        { status: 400 }
      );
    }

    if (updatedPassword !== undefined) {
      const credentialAccount = await prisma.account.findFirst({
        where: {
          userId: currentPatient.user.id,
          providerId: 'credential',
        },
        select: { id: true },
      });

      if (!credentialAccount) {
        return NextResponse.json(
          { error: 'This patient does not have a password-based account.' },
          { status: 400 }
        );
      }
    }

    let passwordHash: string | undefined;
    if (updatedPassword !== undefined) {
      const authContext = await auth.$context;
      const { minPasswordLength, maxPasswordLength } = authContext.password.config;

      if (
        updatedPassword.length < minPasswordLength ||
        updatedPassword.length > maxPasswordLength
      ) {
        return NextResponse.json(
          {
            error: `Password must be between ${minPasswordLength} and ${maxPasswordLength} characters.`,
          },
          { status: 400 }
        );
      }

      passwordHash = await authContext.password.hash(updatedPassword);
    }

    const updatedPatient = await prisma.$transaction(async (tx) => {
      if (updatedAccount !== undefined) {
        await tx.user.update({
          where: { id: currentPatient.user.id },
          data: {
            email: getEmail(updatedAccount),
            name: updatedAccount,
          },
        });
      }

      if (passwordHash !== undefined) {
        const result = await tx.account.updateMany({
          where: {
            userId: currentPatient.user.id,
            providerId: 'credential',
          },
          data: { password: passwordHash },
        });

        if (result.count === 0) {
          throw new Error('Patient credential account disappeared during update.');
        }
      }

      if (Object.keys(patientData).length > 0) {
        await tx.patient.update({
          where: { patientId },
          data: patientData,
        });
      }

      return tx.patient.findUnique({
        where: { patientId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });

    if (!updatedPatient) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }


    return NextResponse.json(
      {
        message: 'Patient updated successfully.',
        patient: updatedPatient ? toPatientResponse(updatedPatient) : null,
      },
      
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to update patient:', error);
    return NextResponse.json({ error: 'Unable to update patient.' }, { status: 500 });
  }
});

export const DELETE = withAuth(['THERAPIST'], async (
  _req: NextRequest,
  _session: AuthSession,
  context: PatientRouteContext
) => {
  try {
    const params = await context.params;
    const patientId = parsePatientId(params.patientId);

    if (!patientId) {
      return NextResponse.json({ error: 'Invalid patientId.' }, { status: 400 });
    }

    const currentPatient = await getCurrentPatient(patientId);

    if (!currentPatient) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: currentPatient.user.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json(
      { message: 'Patient deleted successfully.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to delete patient:', error);
    return NextResponse.json({ error: 'Unable to delete patient.' }, { status: 500 });
  }
});