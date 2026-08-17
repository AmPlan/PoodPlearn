export type PatientHomeState =
	| "needs_standard_assessment"
	| "has_daily_training_plan"
	| "finished_daily_training_plan";

export type WeekStreakDay = {
	label: string;
	score: number | null;
	isToday?: boolean;
};

export type PatientHomeData = {
	patient: {
		id: string;
		code: string;
		name: string;
	};
	nextAction: {
		type: PatientHomeState;
		targetPath: string;
	};
	weekStreak: WeekStreakDay[];
};

export type PatientHomeSuccessResult = {
	success: true;
	data: PatientHomeData;
	errorMessage?: never;
};

export type PatientHomeFailureResult = {
	success: false;
	data?: never;
	errorMessage: string;
};

export type PatientHomeResult =
	| PatientHomeSuccessResult
	| PatientHomeFailureResult;
