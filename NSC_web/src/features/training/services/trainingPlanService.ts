import type {
	TodayTrainingPlan,
	TrainingPlanServiceResult,
} from "../types/trainingPlan.types";

const DAILY_PLAN_API_BASE = "/api/v1/patients";

function createSuccess<T>(data: T): TrainingPlanServiceResult<T> {
	return { success: true, data };
}

function createFailure<T>(errorMessage: string): TrainingPlanServiceResult<T> {
	return { success: false, errorMessage };
}

type DailyPlanApiScheduleEntry = {
	scheduledDate: string;
	planRole: string;
	trainingPlan: {
		trainingPlanTitle: string;
		trainingPlanId: number;
		trainingSetId: number;
	};
	dailyPlanSchedule: {
		dailyPlanScheduleId: number;
		status: "PENDING" | "IN_REVIEW" | "COMPLETED" | "SKIPPED" | "EXPIRED";
	};
};

type DailyPlanApiPayload = {
	category: {
		categoryId: number;
		categoryName: string;
	};
	difficultyId: number | null;
	existingScheduleCount?: number;
	generatedScheduleCount?: number;
	existingSchedules?: DailyPlanApiScheduleEntry[];
	generatedSchedules?: DailyPlanApiScheduleEntry[];
};

export async function getTodayTrainingPlan(
	patientId: number,
): Promise<TrainingPlanServiceResult<TodayTrainingPlan[]>> {
	if (!patientId) {
		return createFailure("ไม่พบข้อมูลผู้ป่วย");
	}

	const date = new Date().toISOString().slice(0, 10);
	const url = `${DAILY_PLAN_API_BASE}/${patientId}/daily-plans?date=${date}`;

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			cache: "no-store",
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => null);
			const errorMessage = errorBody?.error || "ไม่สามารถโหลดแบบฝึกวันนี้ได้";
			return createFailure(errorMessage);
		}

		const body = (await response.json()) as { data: DailyPlanApiPayload };
		const payload = body.data;

		const planEntries = payload.existingSchedules ?? payload.generatedSchedules;

		console.log(planEntries);

		if (!planEntries) {
			return createFailure("ไม่พบแผนในวันนี้");
		}

		const trainingPlans: TodayTrainingPlan[] = [];

		planEntries.forEach((planEntry) => {
			const schedule = planEntry.dailyPlanSchedule;
			const title = planEntry.trainingPlan.trainingPlanTitle;
			const category = payload.category.categoryName;
			const displayCategoryName = category.toLowerCase().includes("naming")
				? "ฝึกเรียกชื่อภาพ"
				: category;

			trainingPlans.push({
				moduleName: title,
				categoryId: payload.category.categoryId.toString(),
				categoryName: displayCategoryName,
				assignedSetId: planEntry.trainingPlan.trainingSetId.toString(),
				status: schedule.status,
			});
		});

		return createSuccess(trainingPlans);
	} catch {
		return createFailure("เกิดข้อผิดพลาดในการเชื่อมต่อไปยังระบบแบบฝึก");
	}
}
