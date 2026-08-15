"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuthSession } from "@/features/auth/services/authSession";
import { getTodayTrainingPlan } from "@/features/training/services/trainingPlanService";
import type { TodayTrainingPlan } from "@/features/training/types/trainingPlan.types";

export default function TrainingTodayPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<TodayTrainingPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadPlan() {
      const session = getAuthSession();

      if (!session || session.role !== "patient") {
        router.replace("/");
        return;
      }

      const result = await getTodayTrainingPlan(session.user.patientId!);

      if (!isActive) {
        return;
      }

      if (!result.success) {
        setErrorMessage(result.errorMessage);
        setIsLoading(false);
        return;
      }

      setPlan(result.data);
      setIsLoading(false);
    }

    loadPlan();

    return () => {
      isActive = false;
    };
  }, [router]);

  function handleStartTraining() {
    if (!plan || isStarting) {
      return;
    }

    setIsStarting(true);
    router.push(`/patient/training/naming/session/${plan.sessionId}`);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#EFFBFD] p-8">
        <p className="text-center text-3xl font-bold text-[#45686A]">
          กำลังเตรียมแบบฝึก...
        </p>
      </main>
    );
  }

  if (errorMessage || !plan) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#EFFBFD] p-8">
        <div className="rounded-4xl bg-white px-8 py-10 text-center shadow-[0_18px_45px_rgba(24,112,108,0.08)]">
          <p className="text-2xl font-bold text-[#B42318]">
            {errorMessage || "ไม่สามารถโหลดแบบฝึกวันนี้ได้"}
          </p>
          <button
            type="button"
            onClick={() => router.push("/patient/home")}
            className="mt-8 inline-flex min-h-14 items-center justify-center rounded-full bg-[#1FA89C] px-7 py-4 text-lg font-semibold text-white shadow-[0_16px_34px_rgba(31,168,156,0.24)] hover:bg-[#178F84]"
          >
            กลับไปหน้าหลัก
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-5 py-6 text-[#123232] sm:px-8 sm:py-7">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-260 flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-[#12847D]">แบบฝึกวันนี้</p>
            <h1 className="mt-3 text-[2.4rem] font-bold leading-tight text-[#123232]">
              ฝึกเรียกชื่อภาพ
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/patient/home")}
            className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#C8E9EA] bg-white px-6 text-base font-semibold text-[#1A7F78] shadow-sm transition hover:bg-[#F5FEFF]"
          >
            ย้อนกลับ
          </button>
        </div>

        <article className="rounded-[34px] border border-[#C8E9EA] bg-white px-7 py-8 shadow-[0_22px_55px_rgba(24,112,108,0.1)] sm:px-10 sm:py-10">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-base font-bold text-[#1FA89C]">{plan.moduleName}</p>
              <h2 className="mt-3 text-[2rem] font-bold leading-tight text-[#123232]">
                {plan.moduleName} หมวด{plan.categoryName}
              </h2>
              <p className="mt-5 text-xl font-medium leading-9 text-[#4E6D70]">
                ระบบเลือกแบบฝึกให้จากผลการฝึกที่ผ่านมา
              </p>
            </div>

            <div className="rounded-[28px] bg-[#F6FEFF] p-6 text-[#123232] shadow-[0_12px_30px_rgba(17,103,99,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#12847D]">
                รายละเอียดแบบฝึก
              </p>
              <div className="mt-6 space-y-4 text-lg font-medium">
                <p>
                  <span className="font-bold text-[#123232]">หมวด:</span> {plan.categoryName}
                </p>
                <p>
                  <span className="font-bold text-[#123232]">จำนวนข้อ:</span> {plan.totalQuestions} ข้อ
                </p>
                <p>
                  <span className="font-bold text-[#123232]">สถานะ:</span> {plan.status === "ready" ? "พร้อมเริ่ม" : plan.status}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              disabled={isStarting}
              onClick={handleStartTraining}
              className="inline-flex min-h-18 w-full items-center justify-center rounded-3xl bg-[#1FA89C] px-7 py-5 text-center text-2xl font-bold text-white shadow-[0_16px_34px_rgba(31,168,156,0.24)] transition hover:bg-[#178F84] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isStarting ? "กำลังเริ่มแบบฝึก..." : "เริ่มแบบฝึก"}
            </button>
          </div>
        </article>
      </div>
    </main>
  );
}
