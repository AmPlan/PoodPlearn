import {
  formatDisplayDate,
  type PatientProgressPoint,
} from "../utils/patientProgress";

type TrainingHistoryProps = {
  points: PatientProgressPoint[];
};

export function TrainingHistory({ points }: TrainingHistoryProps) {
  const sortedPoints = [...points].reverse();

  return (
    <section className="min-w-0 overflow-hidden rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#CDEEEF]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">ประวัติการฝึก</h2>
          <p className="mt-1 text-sm font-semibold text-[#557276]">
            แสดงตาม Filter ปัจจุบัน
          </p>
        </div>
        <span className="rounded-full bg-[#F2FBFB] px-4 py-2 text-sm font-bold text-[#13756F] ring-1 ring-[#CDEEEF]">
          {points.length > 0 ? `${points.length} รายการ` : "ไม่มีรายการ"}
        </span>
      </div>

      {sortedPoints.length === 0 ? (
        <div className="mt-4 rounded-[20px] bg-[#F8FEFF] px-5 py-6 text-center text-sm font-semibold leading-6 text-[#557276] ring-1 ring-[#D7EFF0]">
          ยังไม่มีประวัติการฝึกในช่วงเวลาหรือหมวดที่เลือก
        </div>
      ) : (
        <div className="mt-4 max-h-[360px] overflow-auto pr-1">
          <div className="hidden min-w-[560px] grid-cols-[88px_1fr_120px_96px] gap-3 border-b border-[#D7EFF0] pb-2 text-xs font-bold uppercase tracking-[0.08em] text-[#557276] sm:grid">
            <span>ครั้งที่</span>
            <span>วันที่ / หมวด</span>
            <span>คะแนน</span>
            <span>สถานะ</span>
          </div>

          <div className="grid gap-3 pt-3">
            {sortedPoints.map((point) => (
              <article
                key={point.id}
                className="grid gap-3 rounded-[18px] bg-[#F8FEFF] p-4 ring-1 ring-[#D7EFF0] sm:grid-cols-[88px_1fr_120px_96px] sm:items-center"
              >
                <p className="text-base font-bold text-[#123232]">
                  #{point.sessionNumber}
                </p>
                <div>
                  <p className="text-base font-bold text-[#123232]">
                    {formatDisplayDate(point.date)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#13756F]">
                    {point.categoryLabel}
                  </p>
                </div>
                <p className="text-base font-bold text-[#0F756F]">
                  {point.displayScore}
                </p>
                <p className="w-fit rounded-full bg-white px-3 py-1 text-sm font-bold text-[#557276] ring-1 ring-[#CDEEEF]">
                  {point.percent !== null ? `${point.percent}%` : "รอข้อมูล"}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
export default TrainingHistory;
