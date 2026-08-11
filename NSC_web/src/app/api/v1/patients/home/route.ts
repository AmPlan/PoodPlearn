import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySession } from "@/lib/auth";
import { getBaseUrl } from "@/lib/baseUrl";
import { prisma } from "@/lib/prisma";

async function checkHasFinishedTodayPlan(patientId: number) {
	const lastSession = await prisma.sessionResult.findFirst({
		where: { patientId },
		orderBy: { sessionId: "desc" },
		select: {
			sessionCategoryResult: {
				select: {
					endedAt: true,
				},
			},
		},
	});

	const endedAt = lastSession?.sessionCategoryResult?.endedAt;
	if (!endedAt) {
		return false;
	}

	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);
	const startOfTomorrow = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + 1,
	);

	return endedAt >= startOfToday && endedAt < startOfTomorrow;
}

async function checkHasFinishedAssessment(baseUrl: string, patientId: number) {
	const response = await fetch(
		`${baseUrl}/api/v1/assessments/has-finished?patientId=${patientId}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"x-internal-api-key": process.env.INTERNAL_API_SECRET!,
			},
			cache: "no-store",
		},
	);

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
			return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
		}

		const rawUserId = req.nextUrl.searchParams.get("userId");
		const targetUserId =
			rawUserId === null ? session.userId : Number(rawUserId);

		if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
			return NextResponse.json({ error: "Invalid userId." }, { status: 400 });
		}

		if (session.role !== "THERAPIST" && session.userId !== targetUserId) {
			return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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
			return NextResponse.json(
				{ error: "Patient not found." },
				{ status: 404 },
			);
		}

		const hasFinishedAssessment = await checkHasFinishedAssessment(
			getBaseUrl(),
			patient.patientId,
		);

		let nextAction = {
			type: "needs_standard_assessment",
			targetPath: "/patient/assessment/start",
		};

		if (hasFinishedAssessment) {
			const hasFinishedTodayPlan = await checkHasFinishedTodayPlan(
				patient.patientId,
			);
			if (!hasFinishedTodayPlan) {
				nextAction = {
					type: "has_daily_training_plan",
					targetPath: "/patient/training/today",
				};
			} else {
        nextAction = {
          type: "finished_daily_training_plan",
          targetPath: "/"
        };
			}
		}

		return NextResponse.json(
			{
				patient: {
					code: patient.patientId,
					name: patient.patientFirstName,
				},
				nextAction,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Failed to load patient home data:", error);
		return NextResponse.json(
			{ error: "Unable to load patient home data." },
			{ status: 500 },
		);
	}
}
