import Link from "next/link";
import type { ReactNode } from "react";

type PatientPageShellProps = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  maxWidthClassName?: string;
};

export function PatientPageShell({
  children,
  backHref,
  backLabel = "กลับ",
  maxWidthClassName = "max-w-[920px]",
}: PatientPageShellProps) {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-5 py-6 text-[#123232] sm:px-8 sm:py-7">
      <div
        className={`mx-auto flex min-h-[calc(100dvh-3rem)] w-full flex-col sm:min-h-[calc(100dvh-3.5rem)] ${maxWidthClassName}`}
      >
        <header
          className={
            backHref ? "flex min-h-[56px] items-center justify-start" : "hidden"
          }
        >
          {backHref ? (
            <Link
              className="inline-flex min-h-[56px] items-center justify-center rounded-full border border-[#C8E9EA] bg-white px-7 text-lg font-semibold text-[#1A7F78] outline-none transition hover:bg-[#F5FEFF] focus:ring-4 focus:ring-[#1FA89C]/20 active:scale-[0.98]"
              href={backHref}
            >
              {backLabel}
            </Link>
          ) : null}
        </header>

        <section className="flex flex-1 items-center justify-center py-6 sm:py-7">
          {children}
        </section>
      </div>
    </main>
  );
}
