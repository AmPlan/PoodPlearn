import type { PatientProgressInsights } from "../utils/patientProgress";

type ProgressInsightsProps = {
  insights: PatientProgressInsights;
};

function InsightItem({
  label,
  tone = "teal",
  value,
}: {
  label: string;
  tone?: "teal" | "amber" | "blue";
  value?: string;
}) {
  const toneClass =
    tone === "amber"
      ? "bg-[#FFF7E8] text-[#6A5A2D] ring-[#F3EAC8]"
      : tone === "blue"
        ? "bg-[#F6FAFF] text-[#2F5E9E] ring-[#D7E8FF]"
        : "bg-[#F2FBFB] text-[#0F756F] ring-[#CDEEEF]";

  if (!value) return null;

  return (
    <div className={`min-w-0 rounded-[18px] px-4 py-3 ring-1 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-80">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold leading-6">{value}</p>
    </div>
  );
}
export function ProgressInsights({ insights }: ProgressInsightsProps) {
  if (insights.emptyReason) {
    return (
      <article className="flex h-full min-h-[260px] min-w-0 flex-col rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#CDEEEF]">
        <h2 className="text-xl font-bold">ข้อสังเกตจากผลการฝึก</h2>
        <div className="mt-4 flex flex-1 items-center justify-center rounded-[20px] bg-[#F8FEFF] px-4 py-7 text-center ring-1 ring-[#D7EFF0]">
          <p className="text-sm font-semibold leading-6 text-[#557276]">
            {insights.emptyReason}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="flex h-full min-h-[260px] min-w-0 flex-col rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#CDEEEF]">
      <h2 className="text-xl font-bold">ข้อสังเกตจากผลการฝึก</h2>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#557276]">
        คำนวณแบบ rule-based จากข้อมูลที่บันทึกไว้ ไม่ใช่การวินิจฉัยทางการแพทย์
      </p>

      <div className="mt-4 grid min-h-0 min-w-0 flex-1 content-start gap-3 overflow-y-auto pr-1">
        <InsightItem label="ครั้งแรกเทียบล่าสุด" value={insights.changeText} />
        <InsightItem
          label="หมวดที่ทำได้ดีที่สุด"
          tone="blue"
          value={insights.bestCategoryText}
        />
        <InsightItem
          label="การฝึกล่าสุด"
          value={insights.latestSessionText}
        />
        <InsightItem
          label="ควรติดตาม"
          tone="amber"
          value={insights.watchCategoryText}
        />
      </div>
    </article>
  );
}

export default ProgressInsights;
