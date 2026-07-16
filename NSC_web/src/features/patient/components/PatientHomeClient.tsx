"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import {
  clearAuthSession,
  getAuthSession,
} from "@/features/auth/services/authSession";
import { getPatientHomeData } from "../services/patientHomeService";
import type { PatientHomeData } from "../types/patientHome.types";

export function PatientHomeClient() {
  const router = useRouter();
  const [homeData, setHomeData] = useState<PatientHomeData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showStartToast, setShowStartToast] = useState(false);
  const [isStartingAction, setIsStartingAction] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadHomeData() {
      const session = getAuthSession();

      if (!session || session.role !== "patient") {
        router.replace("/");
        return;
      }

      const result = await getPatientHomeData(session.user.id);

      if (!isActive) {
        return;
      }

      if (!result.success) {
        setErrorMessage(result.errorMessage);
        setIsLoading(false);
        return;
      }

      setHomeData(result.data);
      setIsLoading(false);
    }

    loadHomeData();

    return () => {
      isActive = false;
    };
  }, [router]);

  function handleLogout() {
    clearAuthSession();
    router.push("/");
  }

  function handlePrimaryActionClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    if (!homeData || isStartingAction) {
      return;
    }

    setShowStartToast(true);
    setIsStartingAction(true);

    window.setTimeout(() => {
      router.push(homeData.nextAction.targetPath);
    }, 700);
  }

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-5 py-6 text-[#123232] sm:px-8 sm:py-7">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[1040px] flex-col sm:min-h-[calc(100dvh-3.5rem)]">
        <header className="flex justify-start">
          <button
            className="min-h-[56px] rounded-full border border-[#C8E9EA] bg-white px-7 text-lg font-semibold text-[#1A7F78] outline-none transition hover:bg-[#F5FEFF] focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98]"
            type="button"
            onClick={handleLogout}
          >
            ออกจากระบบ
          </button>
        </header>

        <section className="flex flex-1 items-center justify-center py-6 sm:py-7">
          {isLoading ? (
            <p className="text-center text-2xl font-bold text-[#45686A] sm:text-3xl">
              กำลังโหลดข้อมูล...
            </p>
          ) : errorMessage || !homeData ? (
            <div className="mx-auto w-full max-w-[920px] rounded-[28px] border border-[#F3D0D0] bg-white px-7 py-8 text-center shadow-[0_18px_45px_rgba(24,112,108,0.08)] sm:px-9">
              <p className="text-2xl font-bold text-[#B42318]">
                {errorMessage || "ไม่พบข้อมูลผู้รับบริการ"}
              </p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[920px]">
              <p className="mb-8 text-center text-[2.2rem] font-bold leading-tight sm:text-[2.8rem]">
                สวัสดีค่ะ คุณ{homeData.patient.name}
              </p>

              <article className="rounded-[34px] border border-[#C8E9EA] bg-white px-7 py-8 shadow-[0_22px_55px_rgba(24,112,108,0.1)] sm:px-10 sm:py-10">
                <p className="text-base font-bold text-[#1FA89C] sm:text-lg">
                  {homeData.nextAction.eyebrow}
                </p>
                <h1 className="mt-3 text-[2.2rem] font-bold leading-tight sm:text-[2.65rem]">
                  {homeData.nextAction.title}
                </h1>
                <p className="mt-5 text-xl font-medium leading-9 text-[#4E6D70] sm:text-2xl sm:leading-10">
                  {homeData.nextAction.description}
                </p>

                {typeof homeData.nextAction.progressPercent === "number" ? (
                  <div className="mt-6" aria-label="ความคืบหน้า">
                    <div className="mb-3 flex items-center justify-between text-lg font-bold text-[#4E6D70]">
                      <span>ความคืบหน้า</span>
                      <span>{homeData.nextAction.progressPercent}%</span>
                    </div>
                    <div className="h-5 overflow-hidden rounded-full bg-[#DDF2F3]">
                      <div
                        className="h-full rounded-full bg-[#1FA89C]"
                        style={{
                          width: `${homeData.nextAction.progressPercent}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="relative mt-8">
                  {showStartToast ? (
                    <p
                      className="pointer-events-none absolute -top-16 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#123232] px-6 py-3 text-lg font-semibold text-white shadow-[0_14px_30px_rgba(18,50,50,0.16)]"
                      role="status"
                    >
                      เยี่ยมเลย เริ่มกันเลย!
                    </p>
                  ) : null}

                  <Link
                    className="flex min-h-[72px] w-full items-center justify-center rounded-[24px] bg-[#1FA89C] px-7 py-5 text-center text-2xl font-bold text-white shadow-[0_16px_34px_rgba(31,168,156,0.24)] outline-none transition duration-150 hover:bg-[#178F84] hover:shadow-[0_18px_38px_rgba(31,168,156,0.3)] focus:ring-4 focus:ring-[#1FA89C]/30 active:scale-[0.98] active:bg-[#13786F] sm:text-[1.65rem]"
                    href={homeData.nextAction.targetPath}
                    onClick={handlePrimaryActionClick}
                    aria-disabled={isStartingAction}
                  >
                    {homeData.nextAction.buttonText}
                  </Link>
                </div>
              </article>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
