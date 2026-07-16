import { Gender, prisma } from '@/lib/prisma';

// Initialize Prisma Client
export type CustomCondition = "isMale" | "isFromLampang";

// Update the type to accept patientId and allow null returns if a patient isn't found
type ResolverFunction = (patientId: number) => Promise<boolean | null>;

// Map your conditions to their respective logic using Prisma queries
const conditionResolvers: Record<CustomCondition, ResolverFunction> = {
    isMale: async (patientId: number) => {
        const patient = await prisma.patient.findUnique({
            where: { patientId },
            select: { gender: true },
        });
        return patient ? (patient.gender ? (patient.gender === Gender.MALE) : null) : null;
    },

    isFromLampang: async (patientId: number) => {
        const patient = await prisma.patient.findUnique({
            where: { patientId },
            select: { province: true },
        });
        return patient ? (patient.province ? (patient.province === "ลำปาง") : null) : null;
    },

};

/**
 * Resolves a custom condition string into the expected correct answer 
 * by querying the database for a specific patient.
 * Returns null if the condition is not supported or patient is not found.
 */
export async function resolveCustomCondition(
    condition: string,
    patientId: number
): Promise<boolean | null> {
    if (condition in conditionResolvers) {
        const safeCondition = condition as CustomCondition;
        return await conditionResolvers[safeCondition](patientId);
    }

    console.error(`Unsupported custom condition provided: ${condition}`);
    return null;
}