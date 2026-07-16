type MicrophoneButtonProps = {
  state: "idle" | "recording" | "processing";
  statusText: string;
  helperText: string;
  hasRecording?: boolean;
  onClick: () => void;
  showActionButton?: boolean;
};

function SoundWave({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 items-center gap-3 text-[#9BD8D2] sm:flex ${
        side === "left" ? "right-[calc(100%+22px)]" : "left-[calc(100%+22px)]"
      }`}
      aria-hidden="true"
    >
      {[18, 34, 52, 28, 14].map((height, index) => (
        <span
          className="w-3 rounded-full bg-[#A9DCD6]"
          key={`${side}-${height}-${index}`}
          style={{ height }}
        />
      ))}
    </div>
  );
}

export function MicrophoneButton({
  state,
  statusText,
  helperText,
  hasRecording = false,
  onClick,
  showActionButton = true,
}: MicrophoneButtonProps) {
  const isRecording = state === "recording";

  return (
    <div className="text-center">
      <div className="relative mx-auto w-fit">
        <SoundWave side="left" />
        <SoundWave side="right" />

        <button
          className={`relative mx-auto flex items-center justify-center rounded-full text-8xl shadow-[0_32px_80px_rgba(31,168,156,0.34)] outline-none transition hover:shadow-[0_42px_100px_rgba(31,168,156,0.44)] focus:ring-4 focus:ring-[#1FA89C]/30 active:scale-95 ${
            isRecording
              ? "bg-[#13786F]"
              : "bg-[linear-gradient(180deg,#26BBAE_0%,#178F84_100%)]"
          }`}
          type="button"
          onClick={onClick}
          aria-label="ไมโครโฟน"
          style={{ width: 212, height: 212 }}
        >
          <span className="absolute -inset-9 rounded-full border border-[#B8E5E1] bg-[#DFF7F5]/25" />
          <span className="absolute -inset-4 rounded-full border-2 border-[#C7ECE8]" />
          {isRecording ? (
            <>
              <span className="absolute -inset-6 rounded-full border-4 border-[#1FA89C]/25 animate-ping" />
              <span className="absolute -inset-14 rounded-full border border-[#1FA89C]/20 animate-pulse" />
            </>
          ) : null}
          <span className="relative z-10 text-white text-6xl">🎤</span>
        </button>
      </div>

      <p className="mx-auto mt-7 max-w-[460px] rounded-full bg-[#EFF8F7] px-7 py-4 text-[1.65rem] font-bold text-[#0D7F75] shadow-[inset_0_0_0_1px_#D7EFF0]">
        {statusText}
      </p>
      <p className="mt-4 text-xl font-semibold text-[#6F7F82]">{helperText}</p>
      {showActionButton ? (
        <div className="mt-7 flex flex-col items-center gap-3">
          <button
            className="min-h-[56px] min-w-[240px] rounded-full bg-white px-7 py-3 text-xl font-bold text-[#1A7F78] shadow-[0_10px_24px_rgba(24,112,108,0.08)] outline-none transition hover:bg-[#F5FEFF] focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-95"
            type="button"
            onClick={onClick}
          >
            กดเพื่อพูดตอบ
          </button>

          {hasRecording ? (
            <p className="mx-auto mt-1 inline-flex rounded-full bg-[#EAF9F4] px-6 py-2 text-lg font-semibold text-[#167A52]">
              ✅ บันทึกแล้ว
            </p>
          ) : null}
        </div>
      ) : (
        hasRecording ? (
          <p className="mx-auto mt-5 inline-flex rounded-full bg-[#EAF9F4] px-6 py-3 text-lg font-semibold text-[#167A52]">
            ✅ บันทึกแล้ว
          </p>
        ) : null
      )}
    </div>
  );
}
