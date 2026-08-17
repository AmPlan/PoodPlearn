import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySession } from "@/lib/auth";
import { getBaseUrl } from "@/lib/baseUrl";
import { addDays, startOfDay } from "@/lib/daily-plan/date-utils";
import { prisma } from "@/lib/prisma";

const THAI_WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function formatLocalDateKey(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

async function buildWeekStreak(patientId: number) {
	const today = startOfDay(new Date());
	const startDate = addDays(today, -6);

	const scheduleRows = await prisma.dailyPlanSchedule.findMany({
		where: {
			patientId,
			scheduledDate: {
				gte: startDate,
				lte: today,
			},
		},
		select: {
			scheduledDate: true,
			status: true,
		},
		orderBy: {
			scheduledDate: "asc",
		},
	});

	const statusByDate = new Map<string, Array<string>>();
	for (const row of scheduleRows) {
		const key = formatLocalDateKey(startOfDay(row.scheduledDate));
		const statuses = statusByDate.get(key) ?? [];
		statuses.push(row.status);
		statusByDate.set(key, statuses);
	}

	return Array.from({ length: 7 }, (_, index) => {
		const date = addDays(today, -(6 - index));
		const key = formatLocalDateKey(startOfDay(date));
		const statuses = statusByDate.get(key) ?? [];
		const hasCompletedDay =
			statuses.length > 0 && statuses.every((status) => status === "COMPLETED");

		return {
			label: THAI_WEEKDAY_LABELS[date.getDay()],
			score: hasCompletedDay ? 100 : null,
			isToday: index === 6,
		};
	});
}

async function checkHasFinishedTodayPlan(patientId: number) {
	const targetDate = startOfDay(new Date());
	console.log(targetDate);
	const sessionsStatus = await prisma.dailyPlanSchedule.findMany({
		where: { patientId, scheduledDate: targetDate },
		orderBy: { sessionId: "desc" },
		select: {
			status: true,
		},
	});

	const isFinished = sessionsStatus.length !== 0 && sessionsStatus.every((sessionStatus) => {
		return sessionStatus.status === "COMPLETED";
	})

	return isFinished;
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

		const weekStreak = await buildWeekStreak(patient.patientId);

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
					targetPath: "/",
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
				weekStreak,
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
