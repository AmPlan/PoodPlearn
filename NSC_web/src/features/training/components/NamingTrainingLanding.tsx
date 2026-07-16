import Link from "next/link";
import type { TrainingModule } from "../types/pn002Naming.types";

type NamingTrainingLandingProps = {
  module: TrainingModule;
};

export function NamingTrainingLanding({ module }: NamingTrainingLandingProps) {
  const category = module.categories[0];

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-5 py-6 text-[#123232] sm:px-8 sm:py-7">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[1120px] flex-col">
        <Link
          className="mb-4 inline-flex min-h-[56px] w-fit items-center justify-center rounded-full border border-[#C8E9EA] bg-white px-7 text-xl font-semibold text-[#1A7F78] shadow-[0_10px_24px_rgba(24,112,108,0.1)] transition hover:bg-[#F5FEFF] focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98]"
          href="/patient/home"
        >
          กลับหน้าหลัก
        </Link>

        <section className="flex flex-1 items-center justify-center py-4">
          <article className="relative w-full overflow-hidden rounded-[36px] bg-white px-7 py-8 text-center shadow-[0_26px_70px_rgba(24,112,108,0.13)] ring-1 ring-[#CDEEEF] sm:px-10 sm:py-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 left-0 h-44 w-[42%] rounded-tr-[100%] bg-[#D8F4F0]/75"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-12 right-0 h-44 w-[46%] rounded-tl-[100%] bg-[#D8F4F0]/70"
            />

            <div className="relative mx-auto max-w-[860px]">
              <p className="mx-auto inline-flex min-h-[42px] items-center justify-center rounded-full bg-[#F2FBFB] px-6 text-lg font-semibold text-[#12847D] ring-1 ring-[#CDEEEF]">
                PN002
              </p>
              <h1 className="mt-5 text-[2.35rem] font-bold leading-tight text-[#123232] sm:text-[3rem]">
                {module.title}
              </h1>
              <p className="mt-4 text-xl font-medium leading-9 text-[#4E6D70] sm:text-2xl">
                {module.subtitle}
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-[1fr_1.15fr]">
                <div className="rounded-[30px] bg-[#F6FEFF] px-7 py-7 text-left shadow-[0_12px_30px_rgba(17,103,99,0.08)] ring-1 ring-[#D7EFF0]">
                  <p className="text-lg font-bold text-[#12847D]">
                    เลือกหมวดแบบฝึก
                  </p>
                  <h2 className="mt-3 text-[2rem] font-bold leading-tight text-[#123232]">
                    {category.title}
                  </h2>
                  <p className="mt-3 text-lg font-medium leading-8 text-[#557276]">
                    {category.description}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[28px] bg-[#EAF9F8] px-7 py-6 text-left ring-1 ring-[#CDEEEF]">
                    <p className="text-[2.5rem] font-bold text-[#0F756F]">
                      {category.totalSets}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[#45686A]">
                      ชุดแบบฝึก
                    </p>
                  </div>
                  <div className="rounded-[28px] bg-[#FFFDF6] px-7 py-6 text-left ring-1 ring-[#F3EAC8]">
                    <p className="text-[2.5rem] font-bold text-[#0F756F]">
                      {category.totalQuestions}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[#45686A]">
                      ข้อทั้งหมด
                    </p>
                  </div>
                </div>
              </div>

              <Link
                className="mx-auto mt-8 flex min-h-[72px] w-full max-w-[520px] items-center justify-center rounded-[24px] bg-[#1FA89C] px-7 py-5 text-center text-2xl font-bold text-white shadow-[0_16px_34px_rgba(31,168,156,0.24)] transition hover:bg-[#178F84] focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/30 active:scale-[0.98]"
                href="/patient/training/naming/animals"
              >
                เลือกชุดแบบฝึก
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
