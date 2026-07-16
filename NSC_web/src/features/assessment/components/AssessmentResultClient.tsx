"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PatientPageShell } from "@/components/layout/PatientPageShell";
import { PrimaryActionButton } from "@/components/ui/PrimaryActionButton";
import { getStandardAssessmentResult } from "../services/standardAssessmentService";
import type { StandardAssessmentResult } from "../types/assessment.types";

const categoryEmoji: Record<string, string> = {
  Spontaneous: "💬",
  Comprehension: "👆",
  Repetition: "🔊",
  Naming: "🖼️",
};

const categoryDifficulty: Record<number, string> = {
  1: "ง่าย",
  2: "ปานกลาง",
  3: "ยาก",
}

export function AssessmentResultClient() {
  const router = useRouter();
  const [result, setResult] = useState<StandardAssessmentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadResult() {
      const serviceResult = await getStandardAssessmentResult();

      if (!isActive) {
        return;
      }

      if (!serviceResult.success) {
        setErrorMessage(serviceResult.errorMessage);
        setIsLoading(false);
        return;
      }

      console.log(serviceResult.data)

      setResult(serviceResult.data);
      setIsLoading(false);
    }

    loadResult();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <PatientPageShell maxWidthClassName="max-w-[1040px]">
      {isLoading ? (
        <p className="text-center text-3xl font-bold text-[#45686A]">
          กำลังสรุป...
        </p>
      ) : errorMessage || !result ? (
        <div className="w-full rounded-[32px] border border-[#F3D0D0] bg-white px-7 py-9 text-center shadow-[0_18px_45px_rgba(24,112,108,0.08)]">
          <p className="text-2xl font-bold text-[#B42318]">
            {errorMessage || "ไม่พบผล"}
          </p>
        </div>
      ) : (
        <article className="w-full rounded-[40px] bg-white px-7 py-9 text-center shadow-[0_28px_80px_rgba(24,112,108,0.13)] ring-1 ring-[#C8E9EA]/80 sm:px-10 sm:py-11">
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-[#EAF9F8] text-7xl shadow-[0_18px_40px_rgba(31,168,156,0.15)]">
            🎉
          </div>

          <h1 className="mt-7 text-[2.55rem] font-bold leading-tight text-[#123232] sm:text-[3.6rem]">
            ทำเสร็จแล้ว 🎉
          </h1>
          <p className="mt-3 text-2xl font-semibold text-[#4E6D70] sm:text-[1.7rem]">
            บันทึกผลเรียบร้อย
          </p>

          <div className="mx-auto mt-8 grid max-w-[780px] gap-5 sm:grid-cols-2">
            <div className="rounded-[30px] bg-[#F8FEFF] px-6 py-7 shadow-[0_12px_28px_rgba(24,112,108,0.07)] ring-1 ring-[#D7EFF0]/70">
              <p className="text-5xl">✅</p>
              <p className="mt-3 text-3xl font-bold text-[#123232]">
                ครบ {result.totalQuestions} ข้อ
              </p>
            </div>
            <div className="rounded-[30px] bg-[#F8FEFF] px-6 py-7 shadow-[0_12px_28px_rgba(24,112,108,0.07)] ring-1 ring-[#D7EFF0]/70">
              <p className="text-5xl">📊</p>
              <p className="mt-3 text-3xl font-bold text-[#123232]">
                จัดแผนฝึกให้
              </p>
            </div>
          </div>

          <div className="mx-auto mt-8 grid max-w-[900px] gap-4 sm:grid-cols-4">
            {result.categorySummaries.map((summary) => (
              <section
                className="rounded-[26px] bg-white px-5 py-6 shadow-[0_10px_24px_rgba(24,112,108,0.07)] ring-1 ring-[#D7EFF0]/70"
                key={summary.category}
              >
                <p className="text-5xl">
                  {categoryEmoji[summary.category] || "✅"}
                </p>
                <h2 className="mt-4 text-xl font-bold text-[#123232]">
                  {summary.label}
                </h2>
                <p className="mt-3 rounded-full bg-[#EAF9F4] px-4 py-2 text-base font-semibold text-[#167A52]">
                  แนะนำระดับ: {categoryDifficulty[summary.recommendedDifficultyId] || "Error" }
                </p>
              </section>
            ))}
          </div>

          <div className="mx-auto mt-9 max-w-[580px]">
            <PrimaryActionButton onClick={() => router.push("/patient/home")}>
              {result.homeButtonText}
            </PrimaryActionButton>
          </div>
        </article>
      )}
    </PatientPageShell>
  );
}
