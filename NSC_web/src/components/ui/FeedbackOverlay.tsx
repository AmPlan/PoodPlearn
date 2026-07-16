type FeedbackType = "correct" | "almost" | "wrong" | "hint" | "skipped";

type Props = {
  visible: boolean;
  type?: FeedbackType;
  expectedAnswer?: string;
  mockAnswer?: string;
  hintText?: string;
  onClose?: () => void;
};

export function FeedbackOverlay({
  visible,
  type = "correct",
  expectedAnswer,
  mockAnswer,
  hintText,
  onClose,
}: Props) {
  if (!visible) return null;

  const base = "pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4";

  if (type === "hint") {
    return (
      <div className={`${base}`} aria-live="polite">
        <div className="mx-auto w-full max-w-lg rounded-2xl bg-[#FFF7D9] p-7 text-center shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
          <div className="text-5xl">❓</div>
          <h3 className="mt-4 text-2xl font-bold">คำใบ้</h3>
          <p className="mt-3 text-lg font-semibold leading-8 text-[#5A5A3A]">{hintText || "ลองดูภาพ แล้วพูดชื่อสิ่งที่เห็น"}</p>
          <button
            className="mt-6 inline-flex min-h-[56px] items-center justify-center rounded-full bg-[#F0E28A] px-8 py-3 text-lg font-bold text-[#274024] shadow-sm"
            onClick={onClose}
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    );
  }

    const bg =
    type === "correct"
      ? "bg-[#E9F9F0]"
      : type === "almost"
      ? "bg-[#FFF8E1]"
      : type === "skipped"
      ? "bg-[#EDF5FF]"
      : "bg-[#FFF1F3]";
  const icon =
    type === "correct"
      ? "✅"
      : type === "almost"
      ? "⚠️"
      : type === "skipped"
      ? "⏭️"
      : "↻";
  const title =
    type === "correct"
      ? "ถูกต้อง! เก่งมากเลย!"
      : type === "almost"
      ? "เกือบถูกแล้วค่ะ โปรดลองอีกครั้งนะคะ"
      : type === "skipped"
      ? "ข้ามข้อนี้แล้ว"
      : "โปรดลองอีกครั้งนะคะ";
  const pill =
    type === "correct"
      ? "ระบบจะไปข้อต่อไปในอีก 5 วินาที"
      : type === "skipped"
      ? "กำลังไปข้อต่อไป"
      : "ระบบจะดำเนินการต่อในอีก 3 วินาที";

  return (
    <div className={`${base}`} aria-live="polite">
      <div className={`mx-auto w-full max-w-xl rounded-2xl p-8 text-center shadow-[0_18px_40px_rgba(0,0,0,0.08)] ${bg}`}>
        <div className="text-6xl">{icon}</div>
        <h3 className="mt-4 text-2xl font-bold leading-tight text-[#123232]">{title}</h3>
        {type === "correct" && expectedAnswer ? (
          <p className="mt-3 text-base font-bold text-[#2C6A4F]">คำตอบที่ถูก: {expectedAnswer}</p>
        ) : null}
        {type !== "correct" && mockAnswer ? (
          <p className="mt-3 text-base font-bold text-[#6A4A2A]">คำตอบที่ได้รับ: {mockAnswer}</p>
        ) : null}

        <div className="mt-6 inline-flex items-center justify-center rounded-full bg-white/60 px-5 py-3 text-base font-bold text-[#123232]">
          {pill}
        </div>
      </div>
    </div>
  );
}
