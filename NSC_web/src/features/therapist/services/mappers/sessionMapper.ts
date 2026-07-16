import type {
  ApiHistoryRecord,
  TherapistRecentSession,
} from "../../types/therapist.types";

function getCategoryName(categoryId: number | undefined) {
  switch (categoryId) {
    case 1:
      return "แบบฝึกเรียกชื่อภาพ";
    case 2:
      return "แบบฝึกหัดพูดซ้ำ";
    case 3:
      return "แบบฝึกหัดความเข้าใจภาษา";
    case 4:
      return "แบบฝึกหัดการพูด";
    default:
      return "-";
  }
}

export function mapApiSessionToRecentSession(
  record: ApiHistoryRecord
): TherapistRecentSession {
  if (record.type === "SESSION") {
    const session = record.data;
    const scr = session.sessionCategoryResult;

    return {
      id: String(session.sessionId),
      patientId: String(session.patientId),
      patientName: `${session.patient.patientFirstName} ${session.patient.patientLastName}`.trim(),
      moduleName: getCategoryName(scr?.trainingSet.categoryId),
      summary: scr?.trainingSet.title ?? "",
      completedAt: scr?.endedAt ?? "",
    };
  }

  // ASSESSMENT
  const assessment = record.data;

  return {
    id: String(assessment.assessmentResultId),
    patientId: String(assessment.patientId),
    patientName: `${assessment.patient.patientFirstName} ${assessment.patient.patientLastName}`.trim(),
    moduleName: "แบบทดสอบก่อนใช้งาน",
    summary: "ทำครบ 30 ข้อ",
    completedAt: assessment.endedAt ?? "",
  };
}