// ============================================================================
// 1. TYPES & INTERFACES (ส่วนกำหนดประเภทตัวแปร)
// ============================================================================

export type AssessmentCategoryKey = 'NAMING' | 'COMPREHENSION' | 'REPETITION' | 'SPONTANEOUS';

export type AssessmentCategoryConfig = {
    key: AssessmentCategoryKey;
    categoryName: string;
    aliases: string[];
};

export type AssessmentCategoryRecord = AssessmentCategoryConfig & {
    categoryId: number;
};

export type RecommendedExerciseLevel = 'easy' | 'medium' | 'hard';

export const ExerciseLevelValue: Record<RecommendedExerciseLevel, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
};

export type RecommendedExercise = {
    level: number;
    exerciseType: string;
};

// ============================================================================
// 2. CONSTANTS & CONFIGURATIONS (ส่วนตั้งค่าคงที่)
// ============================================================================

export const ASSESSMENT_CATEGORY_CONFIGS: AssessmentCategoryConfig[] = [
    { key: 'NAMING', categoryName: 'Naming', aliases: ['Naming']},
    { key: 'COMPREHENSION', categoryName: 'Comprehension', aliases: ['Comprehension', 'ImageComprehension', 'COMPREHENSION', 'COMPREHENSION_IMAGE']},
    { key: 'REPETITION', categoryName: 'Repetition', aliases: ['Repetition']},
    { key: 'SPONTANEOUS', categoryName: 'Spontaneous', aliases: ['Spontaneous']},
];


// ตัวช่วยจับคู่ประเภทคำถาม ให้โค้ดสั้นและอ่านง่ายกว่า Switch-Case
const QUESTION_TYPE_MAP: Record<string, AssessmentCategoryKey> = {
    'NAMING': 'NAMING',
    'COMPREHENSION': 'COMPREHENSION',
    'COMPREHENSION_IMAGE': 'COMPREHENSION',
    'REPETITION': 'REPETITION',
    'SPONTANEOUS': 'SPONTANEOUS',
};

const QUESTION_ID_MAP: Record<number, AssessmentCategoryKey> = {
    1: 'NAMING',
    2: 'REPETITION',
    3: 'COMPREHENSION',
    4: 'SPONTANEOUS',
};

// ============================================================================
// 3. UTILITY FUNCTIONS (ฟังก์ชันช่วยเหลือ)
// ============================================================================

export function normalizeLabel(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getAssessmentCategoryId(questionId: number): AssessmentCategoryKey | null {
    return QUESTION_ID_MAP[questionId] || null;
}


export function getAssessmentCategoryKey(questionType: string): AssessmentCategoryKey | null {
    return QUESTION_TYPE_MAP[questionType] || null;
}

// ============================================================================
// 4. CORE LOGIC (ฟังก์ชันคำนวณและประมวลผลหลัก)
// ============================================================================

export function calculateAssessmentItemScore(input: {
    categoryKey: AssessmentCategoryKey;
    questionType: string;
    trainingSetDifficultyLevel: number;
    isCorrect: boolean;
}): { totalScore: number; maxScore: number } {
    const difficultyLevel = Math.max(1, input.trainingSetDifficultyLevel);
        
    const maxScore = difficultyLevel;
    
    // จำกัดความถูกต้องให้อยู่ในช่วง 0 ถึง 1 เท่านั้น
    const validCorrectness = input.isCorrect ? 1 : 0;
    const totalScore = validCorrectness * maxScore;

    return { totalScore, maxScore };
}

export function getRecommendedAssessmentExercise(
    categoryKey: AssessmentCategoryKey,
    totalScore: number
): number {
    // กำหนดระดับความยากตามคะแนน
    /*
        1 = Easy
        2 = Medium
        3 = Hard
    */
    let level: RecommendedExerciseLevel;

    switch (categoryKey) {
        case 'SPONTANEOUS':
            if (totalScore <= 2) {
                level = 'easy';
            } else if (totalScore <= 4) {
                level = 'medium';
            } else {
                level = 'hard';
            }

            break;
        case 'COMPREHENSION':
            if (totalScore <= 4) {
                level = 'easy';
            } else if (totalScore <= 7) {
                level = 'medium';
            } else {
                level = 'hard';
            }

            break;
        case 'REPETITION':
            if (totalScore <= 2) {
                level = 'easy';
            } else if (totalScore <= 5) {
                level = 'medium';
            } else {
                level = 'hard';
            }

            break;
        case 'NAMING':
            if (totalScore <= 2) {
                level = 'easy';
            } else if (totalScore <= 5) {
                level = 'medium';
            } else {
                level = 'hard';
            }

            break;
    }


    return ExerciseLevelValue[level];
}

export async function resolveAssessmentCategories(db: {
    category: { findMany: () => Promise<{ categoryId: number; categoryName: string }[]> };
}): Promise<AssessmentCategoryRecord[]> {
    const dbCategories = await db.category.findMany();
    
    // สร้าง Map เพื่อค้นหา ID ได้เร็วขึ้น (O(1))
    const categoryMap = new Map(
        dbCategories.map((cat) => [normalizeLabel(cat.categoryName), cat])
    );

    return ASSESSMENT_CATEGORY_CONFIGS.map((config) => {
        // หา category จาก aliases ที่กำหนดไว้
        const matchedCategory = config.aliases
            .map((alias) => categoryMap.get(normalizeLabel(alias)))
            .find(Boolean); // ย่อจาก .find((value) => Boolean(value))

        if (!matchedCategory) {
            throw new Error(`Missing assessment category in database: ${config.categoryName}`);
        }

        return {
            ...config,
            categoryId: matchedCategory.categoryId,
        };
    });
}