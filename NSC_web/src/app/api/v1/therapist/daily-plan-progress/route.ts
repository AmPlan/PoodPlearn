import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySession } from "@/lib/auth";
import { startOfDay } from "@/lib/daily-plan/date-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
	try {
		const cookieStore = await cookies();
		const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

		if (!session) {
			return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
		}

		if (session.role !== "THERAPIST") {
			return NextResponse.json({ error: "Forbidden." }, { status: 403 });
		}

		const patientIds = (req.nextUrl.searchParams.get("patientIds") ?? "")
			.split(",")
			.map(Number)
			.filter((patientId) => Number.isInteger(patientId) && patientId > 0);

		if (patientIds.length === 0) {
			return NextResponse.json({ progressByPatient: {} });
		}

		const schedules = await prisma.dailyPlanSchedule.findMany({
			where: {
				patientId: { in: patientIds },
				scheduledDate: startOfDay(new Date()),
			},
			select: { patientId: true, status: true },
		});

		const schedulesByPatient = new Map<number, string[]>();
		for (const schedule of schedules) {
			const statuses = schedulesByPatient.get(schedule.patientId) ?? [];
			statuses.push(schedule.status);
			schedulesByPatient.set(schedule.patientId, statuses);
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
}
