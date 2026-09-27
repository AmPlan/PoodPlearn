import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Patient } from "../../../../generated/prisma/client";

type PatientAccessSession = {
	user: {
		id: string;
		role?: string | null;
	};
};

type PatientIdResult =
    | Patient 
	| NextResponse;

export async function getPatient(
	userId: string,
	session: PatientAccessSession,
): Promise<PatientIdResult> {
	if (session.user.role !== "THERAPIST" && session.user.id !== userId) {
		return NextResponse.json({ error: "Forbidden." }, { status: 403 });
	}

	const patient = await prisma.patient.findUnique({
		where: { userId },
	});

	if (!patient) {
        return NextResponse.json({ error: "Patient not found." }, { status: 404 });
	}

	return patient;
}

export async function getPatientId(session: PatientAccessSession): Promise<number | undefined> {
    const patient = await prisma.patient.findUnique({
        where: { userId: session.user.id },
        select: { patientId: true }
    });

    return patient?.patientId
}

export async function checkPatientPermission(session: PatientAccessSession, PatientId: number): Promise<boolean | NextResponse> {
    const patient = await prisma.patient.findUnique({
        where: { patientId: PatientId },
        select: { userId: true }
    });
    if (!patient) {
        return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }
    if (patient.userId !== session.user.id && session.user.role !== "THERAPIST") {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return true;
}