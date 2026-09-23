import { prisma } from "@/lib/prisma";


export async function hasFinishedAssessment(patientId : number) {
    const finishedAssessmentCount = await prisma.assessmentResult.count({
        where: {
            patientId: patientId,
            endedAt: { not: null },
        },
    });

    return finishedAssessmentCount > 0;
}