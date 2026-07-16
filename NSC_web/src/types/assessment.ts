export interface Category {
    categoryId: number;
    categoryName: string;
}

export interface TrainingSet {
    setId: number;
    title: string;
    isStandardAssessment: boolean;
}

export interface AssessmentCategoryResult {
    assessmentCategoryResultId: number;
    assessmentResultId: number;
    categoryId: number;
    assessmentItemResultId: number | null;
    totalScore: string;
    maxScore: string;
    recommendedDifficultyId: number | null;
    createdAt: string; // ISO 8601 date string
    category: Category;
    recommendedDifficulty: unknown | null; // Update 'unknown' to your specific type if you have a Difficulty interface
}

export interface Assessment {
    assessmentResultId: number;
    patientId: number;
    setId: number;
    startedAt: string; // ISO 8601 date string
    endedAt: string | null; // ISO 8601 date string or null
    trainingSet: TrainingSet;
    assessmentCategoryResults: AssessmentCategoryResult[];
}