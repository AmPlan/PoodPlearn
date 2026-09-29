import { NextRequest, NextResponse } from "next/server";

import { startOfDay } from "@/lib/daily-plan/date-utils";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(["THERAPIST"], async (req: NextRequest) => {
	try {
		const patientIds = (req.nextUrl.searchParams.get("patientIds") ?? "")
			.split(",")
			.map(Number)
			.filter((patientId) => Number.isInteger(patientId) && patientId > 0);

		if (patientIds.length === 0) {
			return NextResponse.json({ progressByPatient: {} });
		}

		const schedules = await prisma.dailyPlanSchedule.findMany({
			where: {
				trainingPlan: { patientId: { in: patientIds } },
				scheduledDate: startOfDay(new Date()),
			},
			select: {
				trainingPlan: { select: { patientId: true } },
				status: true,
			},
		});

		const schedulesByPatient = new Map<number, string[]>();
		for (const schedule of schedules) {
			const patientId = schedule.trainingPlan.patientId;
			const statuses = schedulesByPatient.get(patientId) ?? [];
			statuses.push(schedule.status);
			schedulesByPatient.set(patientId, statuses);
		}

		const progressByPatient = Object.fromEntries(
			Array.from(schedulesByPatient, ([patientId, statuses]) => [
				patientId,
				Math.round(
					(statuses.filter((status) => status === "COMPLETED").length /
						statuses.length) *
						100,
				),
			]),
		);

		return NextResponse.json({ progressByPatient });
	} catch (error) {
		console.error("Failed to load daily plan progress:", error);
		return NextResponse.json(
			{ error: "Unable to load daily plan progress." },
			{ status: 500 },
		);
	}
});
