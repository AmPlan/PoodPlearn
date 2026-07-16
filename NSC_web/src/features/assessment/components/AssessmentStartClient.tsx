"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryActionButton } from "@/components/ui/PrimaryActionButton";
import { getStandardAssessmentIntro } from "../services/standardAssessmentService";
import type { StandardAssessmentIntro } from "../types/assessment.types";

type MicrophoneStatus = "unchecked" | "checking" | "granted" | "denied";

function getTotalQuestionText(infoItems: string[]) {
  const total = infoItems[0]?.match(/\d+/)?.[0];

  return total ? `${total} ข้อ` : infoItems[0] || "หลายข้อ";
}

export function AssessmentStartClient() {
  const router = useRouter();
  const [intro, setIntro] = useState<StandardAssessmentIntro | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [microphoneStatus, setMicrophoneStatus] =
    useState<MicrophoneStatus>("unchecked");

  useEffect(() => {
    let isActive = true;

    async function loadIntro() {
      const result = await getStandardAssessmentIntro();

      if (!isActive) {
        return;
      }

      if (!result.success) {
        setErrorMessage(result.errorMessage);
        setIsLoading(false);
        return;
      }

      setIntro(result.data);
      setIsLoading(false);
    }

    loadIntro();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleMicrophoneCheck() {
    setMicrophoneStatus("checking");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicrophoneStatus("denied");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      stream.getTracks().forEach((track) => track.stop());
      setMicrophoneStatus("granted");
    } catch {
      setMicrophoneStatus("denied");
    }
  }

  function goToAssessmentSession() {
    router.push("/patient/assessment/session");
  }

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-5 py-6 text-[#123232] sm:px-8 sm:py-7">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[1140px] flex-col">
        <Link
          className="mb-4 inline-flex min-h-[56px] w-fit max-w-max items-center justify-center rounded-full border border-[#C8E9EA] bg-white px-7 text-xl font-semibold text-[#1A7F78] shadow-[0_10px_24px_rgba(24,112,108,0.1)] outline-none transition hover:bg-[#F5FEFF] focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-95"
          href="/patient/home"
        >
          ← กลับ
        </Link>

        <section className="flex flex-1 items-start justify-center pt-1 sm:items-center sm:pt-0">
          {isLoading ? (
            <p className="text-center text-3xl font-bold text-[#45686A]">
              กำลังโหลด...
            </p>
          ) : errorMessage || !intro ? (
            <div
              className="w-full rounded-[32px] bg-white px-7 py-9 text-center shadow-[0_18px_45px_rgba(24,112,108,0.08)] ring-1 ring-[#F3D0D0]"
              style={{ maxWidth: 820 }}
            >
              <p className="text-2xl font-bold text-[#B42318]">
                {errorMessage || "ไม่พบข้อมูล"}
              </p>
            </div>
          ) : (
            <article
              className="relative w-full overflow-hidden rounded-[36px] bg-white px-7 pb-7 pt-7 text-center shadow-[0_26px_70px_rgba(24,112,108,0.13)] sm:px-10 sm:pb-8 sm:pt-8"
              style={{ maxWidth: 1040 }}
            >
              <div className="pointer-events-none absolute -bottom-8 left-4 h-36 w-36 rounded-full bg-[#DDF5ED]" />
              <div className="pointer-events-none absolute -bottom-10 right-6 h-36 w-36 rounded-full bg-[#DDF5ED]" />

              <div className="relative">
                <div className="mx-auto grid max-w-[880px] grid-cols-[80px_1fr_80px] items-center gap-4">
                  <div className="hidden h-[88px] w-[88px] items-center justify-center rounded-full bg-[#F4FBF8] text-5xl shadow-[inset_0_0_0_1px_#D7EFF0] sm:flex">
                    <span className="-translate-y-0.5">🧠</span>
                  </div>
                  <div>
                    <h1 className="text-[2.1rem] font-bold leading-tight text-[#123232] sm:text-[2.75rem]">
                      ทำแบบทดสอบก่อนใช้งาน
                    </h1>
                    <p className="mt-3 text-lg font-semibold text-[#667A7D] sm:text-xl">
                      ตอบเท่าที่ทำได้ ไม่ต้องกังวล 💗
                    </p>
                  </div>
                  <div className="hidden h-[88px] w-[88px] items-center justify-center rounded-full bg-[#F4FBF8] text-5xl shadow-[inset_0_0_0_1px_#D7EFF0] sm:flex">
                    <span className="-translate-y-0.5">📋</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="flex min-h-28 items-center gap-5 rounded-3xl bg-[#F8FEFF] px-7 py-6 text-left shadow-[0_12px_28px_rgba(24,112,108,0.07)]">
                    <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full bg-[#EAF9F4] text-5xl">
                      📝
                    </div>
                    <div>
                      <p className="text-4xl font-bold text-[#0F7E78]">
                        {getTotalQuestionText(intro.infoItems)}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[#7A898C]">
                        ทั้งหมด
                      </p>
                    </div>
                  </div>

                  <div className="flex min-h-28 items-center gap-5 rounded-3xl bg-[#FFFDF6] px-7 py-6 text-left shadow-[0_12px_28px_rgba(139,117,56,0.08)]">
                    <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full bg-[#FFF1C8] text-5xl">
                      🎯
                    </div>
                    <div>
                      <p className="text-[1.65rem] font-bold text-[#123232]">
                        ตอบเท่าที่ทำได้
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[#7A898C]">
                        ไม่ต้องกังวล
                      </p>
                    </div>
                  </div>
                </div>

                <section className="mt-7 grid items-center gap-5 rounded-3xl bg-[#EAF9FB] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:grid-cols-[auto_1fr_auto] sm:gap-7 sm:px-8">
                  <div className="relative flex items-center justify-center">
                    <div className="relative flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#1FA89C] text-4xl text-white shadow-[0_18px_36px_rgba(31,168,156,0.22)]">
                      🎤
                      {/* sound-wave decorative lines */}
                      <span className="absolute -right-6 top-1 hidden h-5 w-5 animate-pulse rounded-full bg-[#9EE6DD] sm:block" />
                      <span className="absolute -right-10 top-3 hidden h-3 w-3 rounded-full bg-[#CFF6EE] sm:block" />
                    </div>
                  </div>

                  <div className="text-left">
                    <h2 className="text-2xl font-bold text-[#123232]">
                      ตรวจสอบไมโครโฟน
                    </h2>
                    <p className="mt-2 text-base font-semibold text-[#7A898C]">
                      กดปุ่มเพื่อเช็กเสียงของคุณ
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      className="min-h-[56px] rounded-full border border-[#1FA89C] bg-white px-7 py-3 text-xl font-bold text-[#1A7F78] shadow-[0_10px_22px_rgba(24,112,108,0.08)] outline-none transition hover:bg-[#F5FEFF] focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-95 disabled:cursor-not-allowed disabled:border-[#A9DADC] disabled:text-[#7A999B]"
                      type="button"
                      disabled={microphoneStatus === "checking"}
                      onClick={handleMicrophoneCheck}
                    >
                      🎤 เช็กไมค์
                    </button>

                    <div className="min-w-[160px]">
                      {microphoneStatus === "unchecked" ? (
                        <p className="rounded-full bg-white/10 px-5 py-2 text-base font-semibold text-[#45686A]">
                          ยังไม่ได้เช็ก
                        </p>
                      ) : null}

                      {microphoneStatus === "checking" ? (
                        <p className="rounded-full bg-[#FFFDF6] px-5 py-2 text-base font-semibold text-[#6F5A24]">
                          กำลังเช็ก...
                        </p>
                      ) : null}

                      {microphoneStatus === "granted" ? (
                        <p className="rounded-full bg-[#EAF9F4] px-5 py-2 text-base font-semibold text-[#3F9A56]">
                          ✅ ไมค์พร้อมแล้ว
                        </p>
                      ) : null}

                      {microphoneStatus === "denied" ? (
                        <div className="grid gap-1">
                          <p className="rounded-full bg-[#FFF8E6] px-5 py-2 text-base font-semibold text-[#946200]">
                            ⚠️ เปิดไมค์ก่อน
                          </p>
                          <p className="text-sm font-semibold text-[#6F5A24]">
                            กดรูปกุญแจข้าง URL แล้วเปิดไมค์
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>

                <div className="mx-auto mt-6 grid max-w-[620px] gap-2">
                  <PrimaryActionButton
                    feedbackMessage="✅ เริ่มกันเลย"
                    loadingText="กำลังเริ่ม..."
                    onClick={goToAssessmentSession}
                    className="min-h-[72px] text-[1.65rem]"
                  >
                    ▶ {intro.startButtonText}
                  </PrimaryActionButton>
                </div>
              </div>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}
