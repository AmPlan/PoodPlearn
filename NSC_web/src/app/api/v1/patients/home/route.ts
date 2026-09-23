import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth";
import { addDays, startOfDay } from "@/lib/daily-plan/date-utils";
import { prisma } from "@/lib/prisma";
import { formatLocalDateKey, THAI_WEEKDAY_LABELS } from "@/server/utils/dateUtils";
import { hasFinishedAssessment } from "@/server/utils/assessmentsUtils";


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

export const GET = withAuth(["PATIENT"], async (req, session) => {
	try {


		const rawUserId = req.nextUrl.searchParams.get("userId");
		const targetUserId = rawUserId === null ? session.user.id : rawUserId;

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

		let nextAction = {
			type: "needs_standard_assessment",
			targetPath: "/patient/assessment/session",
		};

		const finishedAssessment = await hasFinishedAssessment(patient.patientId)

		if (finishedAssessment) {
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

)