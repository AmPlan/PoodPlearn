import Link from "next/link";
import type { NamingSet } from "../types/pn002Naming.types";

type NamingAnimalSetsProps = {
  sets: NamingSet[];
};

export function NamingAnimalSets({ sets }: NamingAnimalSetsProps) {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-5 py-6 text-[#123232] sm:px-8 sm:py-7">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[1180px] flex-col">
        <Link
          className="mb-4 inline-flex min-h-[56px] w-fit items-center justify-center rounded-full border border-[#C8E9EA] bg-white px-7 text-xl font-semibold text-[#1A7F78] shadow-[0_10px_24px_rgba(24,112,108,0.1)] transition hover:bg-[#F5FEFF] focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98]"
          href="/patient/training/naming"
        >
          กลับ
        </Link>

        <section className="flex flex-1 items-center justify-center py-4">
          <div className="w-full">
            <div className="mb-7 text-center">
              <p className="mx-auto inline-flex min-h-[42px] items-center justify-center rounded-full bg-[#F2FBFB] px-6 text-lg font-semibold text-[#12847D] ring-1 ring-[#CDEEEF]">
                หมวดสัตว์
              </p>
              <h1 className="mt-5 text-[2.35rem] font-bold leading-tight text-[#123232] sm:text-[3rem]">
                แบบฝึกเรียกชื่อภาพ
              </h1>
              <p className="mt-3 text-xl font-medium text-[#557276]">
                เลือกชุดที่ต้องการฝึก
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {sets.map((set) => (
                <article
                  key={set.id}
                  className="flex min-h-[300px] flex-col rounded-[34px] bg-white px-7 py-7 shadow-[0_18px_48px_rgba(17,103,99,0.11)] ring-1 ring-[#CDEEEF]"
                >
                  <div className="flex-1">
                    <p className="text-lg font-bold text-[#12847D]">
                      หมวดสัตว์
                    </p>
                    <h2 className="mt-4 text-[2.4rem] font-bold leading-tight text-[#123232]">
                      {set.title}
                    </h2>
                    <p className="mt-4 text-xl font-semibold text-[#557276]">
                      จำนวน {set.totalQuestions} ข้อ
                    </p>
                  </div>

                  <Link
                    className="mt-7 flex min-h-[66px] items-center justify-center rounded-[24px] bg-[#1FA89C] px-6 text-center text-xl font-bold text-white shadow-[0_14px_30px_rgba(31,168,156,0.22)] transition hover:bg-[#178F84] focus:outline-none focus:ring-4 focus:ring-[#1FA89C]/30 active:scale-[0.98]"
                    href={`/patient/training/naming/animals/${set.id}`}
                  >
                    เริ่มแบบฝึก
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
