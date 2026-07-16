type ProgressBarProps = {
  percent: number;
  label?: string;
};

export function ProgressBar({ percent, label }: ProgressBarProps) {
  const safePercent = Math.min(100, Math.max(0, percent));

  return (
    <div aria-label={label}>
      <div className="h-5 overflow-hidden rounded-full bg-[#DDF2F3]">
        <div
          className="h-full rounded-full bg-[#1FA89C] transition-[width] duration-300"
          style={{ width: `${safePercent}%` }}
        />
      </div>
    </div>
  );
}
