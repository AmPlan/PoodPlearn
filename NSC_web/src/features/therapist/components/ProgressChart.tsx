"use client";

import { useState } from "react";
import {
  formatDisplayDate,
  getProgressCategoryLabel,
  progressCategoryOptions,
  type PatientProgressPoint,
  type ProgressCategoryKey,
} from "../utils/patientProgress";

type ProgressChartProps = {
  categoryKey: ProgressCategoryKey;
  points: PatientProgressPoint[];
};

const chartWidth = 920;
const chartHeight = 440;
const padding = { top: 28, right: 36, bottom: 70, left: 64 };
const plotWidth = chartWidth - padding.left - padding.right;
const plotHeight = chartHeight - padding.top - padding.bottom;
const yTicks = [0, 25, 50, 75, 100];

function getChartColor(categoryKey: ProgressCategoryKey) {
  return (
    progressCategoryOptions.find((option) => option.key === categoryKey)
      ?.color ?? "#0F756F"
  );
}

function getX(index: number, total: number) {
  if (total <= 1) return padding.left + plotWidth / 2;
  return padding.left + (index * plotWidth) / (total - 1);
}

function getY(percent: number) {
  return padding.top + plotHeight - (percent / 100) * plotHeight;
}

export function ProgressChart({ categoryKey, points }: ProgressChartProps) {
  const [activePoint, setActivePoint] = useState<PatientProgressPoint>();
  const validPoints = points.filter((point) => point.percent !== null);
  const labelStep = Math.max(1, Math.ceil(validPoints.length / 8));
  const color = getChartColor(categoryKey);
  const path = validPoints
    .map((point, index) => {
      const x = getX(index, validPoints.length);
      const y = getY(point.percent ?? 0);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const activeIndex = activePoint
    ? validPoints.findIndex((point) => point.id === activePoint.id)
    : -1;
  const activeX =
    activeIndex >= 0 ? getX(activeIndex, validPoints.length) : undefined;
  const activeY =
    activePoint?.percent !== null && activePoint?.percent !== undefined
      ? getY(activePoint.percent)
      : undefined;

  if (validPoints.length === 0) {
    return (
      <article className="flex min-h-[480px] min-w-0 self-start flex-col rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#CDEEEF]">
        <div>
          <h2 className="text-xl font-bold">
            พัฒนาการตั้งแต่เริ่มฝึกจนถึงปัจจุบัน
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#557276]">
            {getProgressCategoryLabel(categoryKey)}
          </p>
        </div>
        <div className="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-[22px] bg-[#F8FEFF] px-5 py-8 text-center ring-1 ring-[#D7EFF0]">
          <p className="max-w-[420px] text-base font-semibold leading-7 text-[#557276]">
            ไม่มีข้อมูลสำหรับกราฟในช่วงเวลาหรือหมวดที่เลือก ลองเปลี่ยน Filter
            เพื่อดูข้อมูลช่วงอื่น
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="relative flex min-h-[520px] min-w-0 self-start flex-col rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#CDEEEF]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            พัฒนาการตั้งแต่เริ่มฝึกจนถึงปัจจุบัน
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#557276]">
            {getProgressCategoryLabel(categoryKey)} · {validPoints.length} session
          </p>
        </div>
        <p className="rounded-full bg-[#F2FBFB] px-4 py-2 text-xs font-bold text-[#13756F] ring-1 ring-[#CDEEEF]">
          {validPoints.length > 8
            ? `ลด label ทุก ${labelStep} จุดเพื่อให้อ่านง่าย`
            : "แสดงทุกจุดข้อมูล"}
        </p>
      </div>

      <div className="relative mt-4 min-h-[390px] min-w-0 flex-1 rounded-[22px] bg-[#F8FEFF] p-3 ring-1 ring-[#D7EFF0]">
        <svg
          className="h-full min-h-[370px] w-full"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label="พัฒนาการตั้งแต่เริ่มฝึกจนถึงปัจจุบัน"
          onMouseLeave={() => setActivePoint(undefined)}
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
            const y = getY(tick);
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

          {validPoints.map((point, index) => {
            const shouldShowLabel =
              index === 0 ||
              index === validPoints.length - 1 ||
              index % labelStep === 0;
            const x = getX(index, validPoints.length);

            return (
              <g key={`tick-${point.id}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + plotHeight}
                  stroke="#EEF8F8"
                  strokeWidth={1}
                />
                {shouldShowLabel ? (
                  <text
                    x={x}
                    y={chartHeight - 28}
                    textAnchor="middle"
                    className="fill-[#45686A] text-[11px] font-semibold"
                  >
                    {validPoints.length > 10
                      ? `#${point.sessionNumber}`
                      : `${point.date.slice(8, 10)}/${point.date.slice(5, 7)}`}
                  </text>
                ) : null}
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

          <path
            d={path}
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={4}
          />

          {validPoints.map((point, index) => {
            const x = getX(index, validPoints.length);
            const y = getY(point.percent ?? 0);
            const isActive = activePoint?.id === point.id;

            return (
              <circle
                key={point.id}
                cx={x}
                cy={y}
                r={isActive ? 7 : 5}
                fill="#FFFFFF"
                stroke={color}
                strokeWidth={isActive ? 4 : 3}
                className="cursor-pointer"
                onFocus={() => setActivePoint(point)}
                onMouseEnter={() => setActivePoint(point)}
                tabIndex={0}
              >
                <title>
                  {`ครั้งที่ ${point.sessionNumber} · ${formatDisplayDate(
                    point.date,
                  )} · ${point.displayScore} · ${point.percent}%`}
                </title>
              </circle>
            );
          })}

          <text
            x={padding.left + plotWidth / 2}
            y={chartHeight - 8}
            textAnchor="middle"
            className="fill-[#557276] text-[12px] font-bold"
          >
            ครั้งที่ฝึก / วันที่ฝึก
          </text>
          <text
            x={18}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 18 ${padding.top + plotHeight / 2})`}
            className="fill-[#557276] text-[12px] font-bold"
          >
            ความถูกต้อง (%)
          </text>
        </svg>

        {activePoint && activeX !== undefined && activeY !== undefined ? (
          <div
            className="pointer-events-none absolute z-10 w-[240px] -translate-x-1/2 rounded-[18px] bg-[#123232] px-4 py-3 text-sm font-semibold leading-6 text-white shadow-[0_18px_36px_rgba(18,50,50,0.18)]"
            style={{
              left: `${(activeX / chartWidth) * 100}%`,
              top: `${Math.max(4, (activeY / chartHeight) * 100 - 2)}%`,
            }}
          >
            <p className="font-bold">ครั้งที่ {activePoint.sessionNumber}</p>
            <p>วันที่ {formatDisplayDate(activePoint.date)}</p>
            <p>หมวด {activePoint.categoryLabel}</p>
            <p>คะแนน {activePoint.displayScore}</p>
            {activePoint.percent !== null ? (
              <p>ความถูกต้อง {activePoint.percent}%</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default ProgressChart;
