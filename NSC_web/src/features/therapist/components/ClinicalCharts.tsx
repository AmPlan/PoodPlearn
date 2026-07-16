"use client";

import type {
  CategoryScore,
  ProgressBySession,
  ResponseStatusByCategory,
} from "../types/therapistClinical.types";

type ClinicalChartsProps = {
  scores: CategoryScore[];
  progress: ProgressBySession[];
  responseStatuses: ResponseStatusByCategory[];
};

type MetricKey = "spontaneous" | "comprehension" | "repetition" | "naming";

const metrics: Array<{
  key: MetricKey;
  label: string;
  scoreCategory: string;
  color: string;
}> = [
  {
    key: "spontaneous",
    label: "Spontaneous",
    scoreCategory: "Spontaneous",
    color: "#0F756F",
  },
  {
    key: "comprehension",
    label: "Comprehension",
    scoreCategory: "Comprehension",
    color: "#2F80ED",
  },
  {
    key: "repetition",
    label: "Words repetition",
    scoreCategory: "Words repetition",
    color: "#9A6A13",
  },
  {
    key: "naming",
    label: "Naming",
    scoreCategory: "Naming",
    color: "#B42318",
  },
];

const statusSeries = [
  { key: "correct", label: "ตอบถูก", color: "#1FA89C" },
  { key: "incorrect", label: "ตอบผิด", color: "#E15B64" },
  { key: "needsPractice", label: "ควรฝึกซ้ำ", color: "#E2A72E" },
  { key: "pendingReview", label: "รอตรวจโดยนักแก้ไขการพูด", color: "#6287C4" },
] as const;

function getScore(scores: CategoryScore[], category: string) {
  return scores.find((score) => score.category === category);
}

function toPercent(score: number, maxScore: number) {
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}

function getNormalizedScores(scores: CategoryScore[]) {
  return metrics.map((metric) => {
    const score = getScore(scores, metric.scoreCategory);
    const rawScore = score?.score ?? 0;
    const maxScore = score?.maxScore ?? 1;

    return {
      ...metric,
      score: rawScore,
      maxScore,
      percent: toPercent(rawScore, maxScore),
    };
  });
}

function getMaxScoreByMetric(scores: CategoryScore[], metric: (typeof metrics)[number]) {
  return getScore(scores, metric.scoreCategory)?.maxScore ?? 1;
}

function ChartLegend({
  items,
}: {
  items: ReadonlyArray<{ label: string; color: string }>;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold text-[#45686A] ring-1 ring-[#D7EFF0]"
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}

function MultiLineTrendChart({
  scores,
  progress,
}: {
  scores: CategoryScore[];
  progress: ProgressBySession[];
}) {
  const width = 760;
  const height = 360;
  const padding = { top: 34, right: 30, bottom: 72, left: 58 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const yTicks = [0, 25, 50, 75, 100];

  function xAt(index: number) {
    if (progress.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index * plotWidth) / (progress.length - 1);
  }

  function yAt(percent: number) {
    return padding.top + plotHeight - (percent / 100) * plotHeight;
  }

  function normalizedValue(session: ProgressBySession, metric: (typeof metrics)[number]) {
    return toPercent(session[metric.key], getMaxScoreByMetric(scores, metric));
  }

  function pathForMetric(metric: (typeof metrics)[number]) {
    return progress
      .map((session, index) => {
        const x = xAt(index);
        const y = yAt(normalizedValue(session, metric));
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }

  return (
    <article className="rounded-[26px] bg-[#F8FEFF] p-5 ring-1 ring-[#D7EFF0]">
      <div>
        <h2 className="text-xl font-bold">พัฒนาการตั้งแต่เริ่มฝึกจนถึงปัจจุบัน</h2>
        <p className="mt-1 text-sm font-medium text-[#557276]">
          คะแนนทุกหมวดถูก normalize เป็นเปอร์เซ็นต์ เพื่อเทียบแนวโน้มระหว่างหมวดได้ชัดขึ้น
        </p>
      </div>

      <svg
        className="mt-4 h-auto w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Multi-line chart normalized scores by session"
      >
        <rect
          x={padding.left}
          y={padding.top}
          width={plotWidth}
          height={plotHeight}
          rx={18}
          fill="#FFFFFF"
        />

        {yTicks.map((tick) => {
          const y = yAt(tick);
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="#D7EFF0"
                strokeWidth={1}
              />
              <text
                x={padding.left - 12}
                y={y + 4}
                textAnchor="end"
                className="fill-[#557276] text-[12px] font-semibold"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {progress.map((session, index) => {
          const x = xAt(index);
          return (
            <g key={session.date}>
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={padding.top + plotHeight}
                stroke="#EEF8F8"
                strokeWidth={1}
              />
              <text
                x={x}
                y={height - 34}
                textAnchor="middle"
                className="fill-[#45686A] text-[12px] font-semibold"
              >
                {session.date.slice(5)}
              </text>
            </g>
          );
        })}

        <line
          x1={padding.left}
          y1={padding.top + plotHeight}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight}
          stroke="#AFCFD1"
          strokeWidth={2}
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + plotHeight}
          stroke="#AFCFD1"
          strokeWidth={2}
        />

        {metrics.map((metric) => (
          <g key={metric.key}>
            <path
              d={pathForMetric(metric)}
              fill="none"
              stroke={metric.color}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {progress.map((session, index) => {
              const percent = normalizedValue(session, metric);
              const x = xAt(index);
              const y = yAt(percent);

              return (
                <circle
                  key={`${metric.key}-${session.date}`}
                  cx={x}
                  cy={y}
                  r={5}
                  fill="#FFFFFF"
                  stroke={metric.color}
                  strokeWidth={3}
                >
                  <title>{`${metric.label} ${session.date}: ${percent}%`}</title>
                </circle>
              );
            })}
          </g>
        ))}

        <text
          x={padding.left + plotWidth / 2}
          y={height - 10}
          textAnchor="middle"
          className="fill-[#557276] text-[12px] font-bold"
        >
          วันที่ / session
        </text>
        <text
          x={20}
          y={padding.top + plotHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 20 ${padding.top + plotHeight / 2})`}
          className="fill-[#557276] text-[12px] font-bold"
        >
          คะแนน normalized (%)
        </text>
      </svg>

      <ChartLegend items={metrics} />
    </article>
  );
}

function ResponseStatusChart({
  responseStatuses,
}: {
  responseStatuses: ResponseStatusByCategory[];
}) {
  const width = 760;
  const height = 360;
  const padding = { top: 34, right: 28, bottom: 82, left: 58 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    1,
    ...responseStatuses.flatMap((item) =>
      statusSeries.map((series) => item[series.key]),
    ),
  );
  const roundedMax = Math.max(5, Math.ceil(maxValue / 5) * 5);
  const yTicks = Array.from({ length: roundedMax / 5 + 1 }, (_, index) => index * 5);
  const groupWidth = plotWidth / Math.max(1, responseStatuses.length);
  const barWidth = Math.min(28, (groupWidth - 28) / statusSeries.length);

  function yAt(value: number) {
    return padding.top + plotHeight - (value / roundedMax) * plotHeight;
  }

  return (
    <article className="rounded-[26px] bg-[#F8FEFF] p-5 ring-1 ring-[#D7EFF0]">
      <div>
        <h2 className="text-xl font-bold">สถานะคำตอบแยกตามหมวด</h2>
        <p className="mt-1 text-sm font-medium text-[#557276]">
          ดูจำนวนคำตอบถูก ผิด ควรฝึกซ้ำ และรายการที่ยังรอตรวจยืนยัน
        </p>
      </div>

      <svg
        className="mt-4 h-auto w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Grouped bar chart response status by category"
      >
        <rect
          x={padding.left}
          y={padding.top}
          width={plotWidth}
          height={plotHeight}
          rx={18}
          fill="#FFFFFF"
        />

        {yTicks.map((tick) => {
          const y = yAt(tick);
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="#D7EFF0"
                strokeWidth={1}
              />
              <text
                x={padding.left - 12}
                y={y + 4}
                textAnchor="end"
                className="fill-[#557276] text-[12px] font-semibold"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {responseStatuses.map((item, groupIndex) => {
          const groupStart = padding.left + groupIndex * groupWidth;
          const barsTotalWidth = statusSeries.length * barWidth + (statusSeries.length - 1) * 8;
          const barsStart = groupStart + (groupWidth - barsTotalWidth) / 2;
          const labelX = groupStart + groupWidth / 2;

          return (
            <g key={item.category}>
              {statusSeries.map((series, seriesIndex) => {
                const value = item[series.key];
                const x = barsStart + seriesIndex * (barWidth + 8);
                const y = yAt(value);
                const barHeight = padding.top + plotHeight - y;

                return (
                  <g key={series.key}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={8}
                      fill={series.color}
                    >
                      <title>{`${item.category} - ${series.label}: ${value}`}</title>
                    </rect>
                    <text
                      x={x + barWidth / 2}
                      y={y - 6}
                      textAnchor="middle"
                      className="fill-[#45686A] text-[11px] font-bold"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              <text
                x={labelX}
                y={height - 44}
                textAnchor="middle"
                className="fill-[#123232] text-[12px] font-bold"
              >
                {item.category}
              </text>
            </g>
          );
        })}

        <line
          x1={padding.left}
          y1={padding.top + plotHeight}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight}
          stroke="#AFCFD1"
          strokeWidth={2}
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + plotHeight}
          stroke="#AFCFD1"
          strokeWidth={2}
        />
      </svg>

      <ChartLegend items={statusSeries} />
    </article>
  );
}

function InsightSummary({
  scores,
  progress,
}: {
  scores: CategoryScore[];
  progress: ProgressBySession[];
}) {
  const normalizedScores = getNormalizedScores(scores);
  const best = [...normalizedScores].sort((a, b) => b.percent - a.percent)[0];
  const weakest = [...normalizedScores].sort((a, b) => a.percent - b.percent)[0];
  const firstSession = progress[0];
  const latestSession = progress[progress.length - 1];
  const namingMax = getScore(scores, "Naming")?.maxScore ?? 15;
  const namingDelta = latestSession && firstSession ? latestSession.naming - firstSession.naming : 0;
  const trendLabel =
    namingDelta > 0
      ? `Naming เพิ่มขึ้นจาก ${firstSession.naming}/${namingMax} เป็น ${latestSession.naming}/${namingMax}`
      : namingDelta < 0
        ? `Naming ลดลงจาก ${firstSession.naming}/${namingMax} เป็น ${latestSession.naming}/${namingMax}`
        : `Naming คงที่ที่ ${latestSession?.naming ?? 0}/${namingMax}`;

  return (
    <article className="rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-[#CDEEEF]">
      <h2 className="text-xl font-bold">ข้อสังเกตจากระบบ</h2>
      <div className="mt-4 grid gap-3">
        <p className="rounded-2xl bg-[#F2FBFB] px-4 py-3 text-base font-semibold text-[#45686A]">
          หมวดที่ทำได้ดีที่สุด:{" "}
          <span className="text-[#0F756F]">
            {best.label} {best.percent}%
          </span>
        </p>
        <p className="rounded-2xl bg-[#FFF7E8] px-4 py-3 text-base font-semibold text-[#45686A]">
          หมวดที่ควรฝึกต่อ:{" "}
          <span className="text-[#8A5D12]">
            {weakest.label} {weakest.percent}%
          </span>
        </p>
        <p className="rounded-2xl bg-[#F6FAFF] px-4 py-3 text-base font-semibold text-[#45686A]">
          แนวโน้มล่าสุด: <span className="text-[#2F5E9E]">{trendLabel}</span>
        </p>
        <p className="rounded-2xl bg-[#FFF1F3] px-4 py-3 text-base font-semibold text-[#45686A]">
          ข้อควรระวัง: ผลจาก AI/ASR เป็นข้อมูลเบื้องต้น ต้องตรวจซ้ำจากเสียงผู้รับบริการ
        </p>
      </div>
      <p className="mt-4 rounded-2xl bg-[#F8FEFF] px-4 py-3 text-sm font-semibold leading-6 text-[#557276] ring-1 ring-[#D7EFF0]">
        ระบบช่วยสรุปเบื้องต้น นักแก้ไขการพูดควรตรวจยืนยันจากเสียงผู้รับบริการอีกครั้ง
      </p>
    </article>
  );
}

export default function ClinicalCharts({
  scores,
  progress,
  responseStatuses,
}: ClinicalChartsProps) {
  return (
    <section className="grid gap-5">
      <MultiLineTrendChart scores={scores} progress={progress} />
      <ResponseStatusChart responseStatuses={responseStatuses} />
      <InsightSummary scores={scores} progress={progress} />
    </section>
  );
}
