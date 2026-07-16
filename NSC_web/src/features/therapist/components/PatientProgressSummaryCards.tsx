import type { PatientProgressSummary } from "../utils/patientProgress";
import { formatDisplayDate, formatPercent } from "../utils/patientProgress";

type PatientProgressSummaryCardsProps = {
  layout?: "row" | "stack";
  summary: PatientProgressSummary;
};

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-[20px] bg-white px-4 py-3 shadow-sm ring-1 ring-[#CDEEEF]">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#12847D]">
        {label}
      </p>
      <p className="mt-1 text-[clamp(1.35rem,1.8vw,1.75rem)] font-bold leading-tight text-[#123232]">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-sm font-semibold leading-5 text-[#557276]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}
export function PatientProgressSummaryCards({
  layout = "row",
  summary,
}: PatientProgressSummaryCardsProps) {
  return (
    <section
      className={`grid gap-3 ${
        layout === "stack"
          ? "sm:grid-cols-2 xl:grid-cols-1"
          : "sm:grid-cols-2 xl:grid-cols-4"
      }`}
    >
      <SummaryCard
        label="จำนวนครั้งที่ฝึก"
        value={summary.sessionCount > 0 ? summary.sessionCount : "—"}
        detail={summary.sessionCount > 0 ? "ตาม Filter ปัจจุบัน" : "ยังไม่มีข้อมูล"}
      />
      <SummaryCard
        label="คะแนนล่าสุด"
        value={summary.latestPoint?.displayScore ?? "—"}
        detail={
          summary.latestPoint
            ? `${formatPercent(summary.latestPoint.percent)} · ${summary.latestPoint.categoryLabel}`
            : "ไม่มีข้อมูลในช่วงที่เลือก"
        }
      />
      <SummaryCard
        label="คะแนนเฉลี่ย"
        value={formatPercent(summary.averagePercent)}
        detail="คำนวณจาก session ที่ตรงกับ Filter"
      />
      <SummaryCard
        label="วันที่ฝึกล่าสุด"
        value={formatDisplayDate(summary.latestDate)}
        detail={summary.latestCategoryLabel}
      />
    </section>
  );
}

export default PatientProgressSummaryCards;
