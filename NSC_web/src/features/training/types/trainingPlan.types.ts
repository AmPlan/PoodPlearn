export type TodayTrainingPlan = {
		moduleName: string;
		categoryId: string;
		categoryName: string;
		assignedSetId: string;
		dailyPlanScheduleId: string;
		status: "PENDING" | "IN_REVIEW" | "COMPLETED" | "SKIPPED" | "EXPIRED";
	};

export type TrainingPlanServiceSuccessResult<T> = {
  success: true;
  data: T;
  errorMessage?: never;
};

export type TrainingPlanServiceFailureResult = {
  success: false;
  data?: never;
  errorMessage: string;
};

export type TrainingPlanServiceResult<T> =
  | TrainingPlanServiceSuccessResult<T>
  | TrainingPlanServiceFailureResult;
