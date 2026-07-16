"use client";

import { useMemo, useState } from "react";
import PatientProgressSummaryCards from "./PatientProgressSummaryCards";
import ProgressChart from "./ProgressChart";
import ProgressFilters from "./ProgressFilters";
import ProgressInsights from "./ProgressInsights";
import ReportPreview from "./ReportPreview";
import TrainingHistory from "./TrainingHistory";
import type { TherapistPatientDetail as TherapistPatientDetailData } from "../types/therapist.types";
import type {
  CategoryScore,
  ProgressBySession,
} from "../types/therapistClinical.types";
import {
  getCategoryAggregates,
  getFilteredProgressPoints,
  getProgressInsights,
  getProgressSummary,
  type PatientProgressFilters,
} from "../utils/patientProgress";

type ActiveWorkspaceTab = "overview" | "report";

const workspaceTabs: Array<{ key: ActiveWorkspaceTab; label: string }> = [
  { key: "overview", label: "ภาพรวม" },
  { key: "report", label: "รายงาน" },
];

export default function TherapistPatientDetailClient({
  patient,
  categoryScores,
  progressBySession,
}: {
  patient: TherapistPatientDetailData;
  categoryScores: CategoryScore[];
  progressBySession: ProgressBySession[];
}) {
  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>("overview");
  const [filters, setFilters] = useState<PatientProgressFilters>({
    categoryKey: "overview",
    timeRangeKey: "all",
  });

  const points = useMemo(
    () => getFilteredProgressPoints(progressBySession, categoryScores, filters),
    [categoryScores, filters, progressBySession],
  );
  const aggregates = useMemo(
    () => getCategoryAggregates(progressBySession, categoryScores, filters),
    [categoryScores, filters, progressBySession],
  );
  const summary = useMemo(() => getProgressSummary(points), [points]);
  const insights = useMemo(
    () => getProgressInsights({ aggregates, filters, points }),
    [aggregates, filters, points],
  );

  return (
    <section className="mt-4 flex min-w-0 flex-col gap-4">
      <div className="no-print grid min-w-0 gap-3 overflow-hidden rounded-[24px] bg-white p-3 shadow-sm ring-1 ring-[#CDEEEF] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <ProgressFilters value={filters} onChange={setFilters} />
        <div className="flex w-full min-w-0 rounded-full bg-[#F2FBFB] p-1 ring-1 ring-[#CDEEEF] sm:w-fit">
          {workspaceTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`min-h-[40px] flex-1 rounded-full px-5 text-sm font-bold transition sm:flex-none ${
                activeTab === tab.key
                  ? "bg-[#1FA89C] text-white shadow-sm"
                  : "text-[#13756F] hover:bg-white"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" ? (
        <>
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(300px,0.8fr)]">
            <ProgressChart categoryKey={filters.categoryKey} points={points} />
            <aside className="grid min-w-0 content-start gap-4">
              <PatientProgressSummaryCards layout="stack" summary={summary} />
            </aside>
          </div>
          <TrainingHistory points={points} />
        </>
      ) : (
        <>
          <PatientProgressSummaryCards summary={summary} />
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
            <div className="grid min-w-0 gap-4">
              <ProgressChart categoryKey={filters.categoryKey} points={points} />
              
            </div>
            <aside className="grid min-w-0 content-start gap-4 xl:sticky xl:top-4">
              <ProgressInsights insights={insights} />

            </aside>
          </div>
          <ReportPreview
            filters={filters}
            insights={insights}
            patient={patient}
            points={points}
            summary={summary}
          />

        </>
      )}
    </section>
  );
}