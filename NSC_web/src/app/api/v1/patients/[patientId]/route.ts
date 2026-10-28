import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { auth, AuthSession, withAuth } from '@/server/auth';
import { checkPatientPermission } from '@/lib/server/utils/patientUtils';
import { getEmail } from '@/lib/shared/utils/emailUtils';
import { z } from 'zod';

type PatientRouteContext = {
  params: { patientId: string } | Promise<{ patientId: string }>;
};

const accountRegex = /^HN\d{6}$/; //TODO ยังไม่ Confirm

const requiredText = (field: string) =>
  z
    .string({ error: `${field} is required.` })
    .trim()
    .min(1, `${field} is required.`);

const optionalText = (field: string) => requiredText(field).optional();

const nullableText = (field: string) =>
  z
    .union([z.string().transform((value) => value.trim() || null), z.null()], {
      error: `Invalid ${field}.`,
    })
    .optional();

const optionalCount = (field: string) => {
  const error = `Invalid ${field}.`;

  return z.preprocess(
    (value) => {
      if (value === null || value === '') return 0;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? Number.NaN : Number(trimmed);
      }
      return value;
    },
    z.number({ error }).int({ error }).min(0, { error }).optional(),
  );
};

const invalidDateOfBirth = 'Invalid dateOfBirth. Use a valid ISO date string.';
const UpdatePatientBody = z.object({
  account: requiredText('account').regex(accountRegex, 'Invalid account.').optional(),
  password: optionalText('password'),
  patientFirstName: optionalText('patientFirstName'),
  patientLastName: optionalText('patientLastName'),
  gender: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.enum(['MALE', 'FEMALE', 'OTHER'], {
      error: 'Invalid gender. Use MALE or FEMALE.',
    }),
  ).optional(),
  dateOfBirth: z
    .string({ error: invalidDateOfBirth })
    .trim()
    .pipe(z.coerce.date({ error: invalidDateOfBirth }))
    .optional(),
  occupation: optionalText('occupation'),
  province: optionalText('province'),
  note: nullableText('note'),
  caregiverFirstName: optionalText('caregiverFirstName'),
  caregiverLastName: optionalText('caregiverLastName'),
  caregiverRelationship: optionalText('caregiverRelationship'),
  caregiverTelephone: nullableText('caregiverTelephone'),
  familyStatus: nullableText('familyStatus'),
  householdMembersCount: optionalCount('householdMembersCount'),
  childrenCount: optionalCount('childrenCount'),
  postcode: nullableText('postcode'),
});

function parsePatientId(value: string) {
  const patientId = Number(value);

  return Number.isInteger(patientId) && patientId > 0 ? patientId : null;
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

    const permission = await checkPatientPermission(session, currentPatient);
    if (permission !== true) {
      return permission;
    }

    const parsedBody = UpdatePatientBody.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? 'Invalid request body.' },
        { status: 400 }
      );
    }

    const { account: updatedAccount, password: updatedPassword, ...patientData } = parsedBody.data;

    if (updatedAccount !== undefined) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: getEmail(updatedAccount),
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