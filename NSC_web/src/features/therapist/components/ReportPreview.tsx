"use client";

import { useMemo, useState } from "react";
import type { TherapistPatientDetail } from "../types/therapist.types";
import {
  formatDisplayDate,
  formatPercent,
  getProgressCategoryLabel,
  getProgressTimeRangeLabel,
  type PatientProgressFilters,
  type PatientProgressInsights,
  type PatientProgressPoint,
  type PatientProgressSummary,
} from "../utils/patientProgress";

type ReportPreviewProps = {
  filters: PatientProgressFilters;
  insights: PatientProgressInsights;
  patient: TherapistPatientDetail;
  points: PatientProgressPoint[];
  summary: PatientProgressSummary;
};

function buildReportText({
  filters,
  insights,
  patient,
  points,
  summary,
  therapistNote,
}: ReportPreviewProps & { therapistNote: string }) {
  const lines = [
    "พูดเพลิน (PoodPlearn)",
    "รายงานผลการฝึกรายบุคคล",
    "",
    `ผู้รับบริการ: ${patient.name}`,
    `รหัสผู้รับบริการ: ${patient.code}`,
    `ช่วงเวลา: ${getProgressTimeRangeLabel(filters.timeRangeKey)}`,
    `หมวด: ${getProgressCategoryLabel(filters.categoryKey)}`,
    `วันที่ออกรายงาน: ${new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
    }).format(new Date())}`,
    "",
    `จำนวนครั้งที่ฝึก: ${summary.sessionCount > 0 ? summary.sessionCount : "—"}`,
    `คะแนนครั้งแรก: ${summary.firstPoint?.displayScore ?? "—"}`,
    `คะแนนล่าสุด: ${summary.latestPoint?.displayScore ?? "—"}`,
    `คะแนนเฉลี่ย: ${formatPercent(summary.averagePercent)}`,
    "",
    "ข้อสังเกตจากระบบ",
  ];

  if (insights.emptyReason) {
    lines.push(`- ${insights.emptyReason}`);
  } else {
    [
      insights.changeText,
      insights.bestCategoryText,
      insights.latestSessionText,
      insights.watchCategoryText,
    ]
      .filter(Boolean)
      .forEach((line) => lines.push(`- ${line}`));
  }

  lines.push("");
  lines.push("สรุป Session");

  if (points.length === 0) {
    lines.push("- ไม่มีข้อมูลสำหรับสร้างรายงานตาม Filter นี้");
  } else {
    points.forEach((point) => {
      lines.push(
        `- ครั้งที่ ${point.sessionNumber} · ${formatDisplayDate(point.date)} · ${point.categoryLabel} · ${point.displayScore} · ${formatPercent(point.percent)}`,
      );
    });
  }

  if (therapistNote.trim()) {
    lines.push("");
    lines.push("บันทึกนักแก้ไขการพูด");
    lines.push(therapistNote.trim());
  }

  return lines.join("\n");
}
export function ReportPreview(props: ReportPreviewProps) {
  const [copyStatus, setCopyStatus] = useState("คัดลอกรายงาน");
  const [therapistNote, setTherapistNote] = useState("");
  const reportText = useMemo(
    () => buildReportText({ ...props, therapistNote }),
    [props, therapistNote],
  );

  async function copyReport() {
    if (!navigator.clipboard) return;

    await navigator.clipboard.writeText(reportText);
    setCopyStatus("คัดลอกแล้ว");
    window.setTimeout(() => setCopyStatus("คัดลอกรายงาน"), 1800);
  }

  function printReport() {
    window.print();
  }

  return (
    <section className="print-card min-w-0 overflow-hidden rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#CDEEEF]">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex rounded-full bg-[#F2FBFB] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#12847D] ring-1 ring-[#CDEEEF]">
            PoodPlearn report
          </p>
          <h2 className="mt-3 text-xl font-bold">รายงานผลรายบุคคล</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#557276]">
            Print และ Save as PDF ใช้ข้อมูลตาม Filter ปัจจุบัน
          </p>
        </div>
        <div className="no-print flex min-w-0 flex-wrap gap-2">
          <button
            type="button"
            className="min-h-[42px] rounded-full bg-white px-4 text-sm font-bold text-[#13756F] ring-1 ring-[#CDEEEF] hover:bg-[#F7FFFF]"
            onClick={copyReport}
          >
            {copyStatus}
          </button>
          <button
            type="button"
            className="min-h-[42px] rounded-full bg-[#1FA89C] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(31,168,156,0.22)] hover:bg-[#178F84]"
            onClick={printReport}
          >
            พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 rounded-[20px] bg-[#F8FEFF] p-4 text-sm font-semibold leading-6 text-[#45686A] ring-1 ring-[#D7EFF0] sm:grid-cols-2">
        <p>ผู้รับบริการ: {props.patient.name}</p>
        <p>รหัส: {props.patient.code}</p>
        <p>ช่วงเวลา: {getProgressTimeRangeLabel(props.filters.timeRangeKey)}</p>
        <p>หมวด: {getProgressCategoryLabel(props.filters.categoryKey)}</p>
      </div>

      <div className="no-print mt-4">
        <label className="text-sm font-bold text-[#12847D]" htmlFor="therapist-report-note">
          บันทึกนักแก้ไขการพูด
        </label>
        <textarea
          id="therapist-report-note"
          className="mt-2 min-h-[84px] w-full resize-none rounded-[18px] border border-[#D7EFF0] bg-white p-3 text-sm font-semibold leading-6 text-[#123232] outline-none focus:border-[#1FA89C] focus:ring-4 focus:ring-[#1FA89C]/15"
          value={therapistNote}
          onChange={(event) => setTherapistNote(event.target.value)}
          placeholder="เพิ่มบันทึกสำหรับรายงานฉบับนี้"
        />
      </div>

      <div className="no-print mt-4 max-h-[260px] min-w-0 overflow-y-auto rounded-[18px] bg-[#F8FEFF] p-4 text-sm font-semibold leading-6 text-[#123232] ring-1 ring-[#D7EFF0]">
        <pre className="whitespace-pre-wrap break-words font-[inherit]">{reportText}</pre>
      </div>
    </section>
  );
}

export default ReportPreview;
