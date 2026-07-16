import Link from "next/link";
import type { TherapistDashboardData } from "../types/therapist.types";

type TherapistDashboardProps = {
  data: TherapistDashboardData;
};

function formatDateTime(value: string | undefined) {
  if (value === undefined) {
    return "-";
  }
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ProgressLine({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-base font-bold text-[#45686A]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#DDF2F3]">
        <div
          className="h-full rounded-full bg-[#1FA89C]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function TherapistDashboard({ data }: TherapistDashboardProps) {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-5 py-6 text-[#123232] sm:px-8">
      <div className="mx-auto w-full max-w-[1240px]">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex min-h-[38px] items-center rounded-full bg-[#F2FBFB] px-5 text-base font-semibold text-[#12847D] ring-1 ring-[#CDEEEF]">
              นักแก้ไขการพูด
            </p>
            <h1 className="mt-4 text-[2.4rem] font-bold leading-tight sm:text-[3rem]">
              แดชบอร์ดนักแก้ไขการพูด
            </h1>
          </div>
          <Link
            className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-white px-7 text-lg font-bold text-[#13756F] shadow-[0_10px_24px_rgba(17,103,99,0.1)] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF]"
            href="/"
          >
            กลับหน้าเข้าสู่ระบบ
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[30px] bg-white px-7 py-6 shadow-[0_16px_36px_rgba(17,103,99,0.09)] ring-1 ring-[#CDEEEF]">
            <p className="text-lg font-bold text-[#557276]">ผู้รับบริการทั้งหมด</p>
            <p className="mt-3 text-5xl font-bold text-[#0F756F]">
              {data.totalPatients}
            </p>
          </div>
          <div className="rounded-[30px] bg-white px-7 py-6 shadow-[0_16px_36px_rgba(17,103,99,0.09)] ring-1 ring-[#CDEEEF]">
            <p className="text-lg font-bold text-[#557276]">
              ผู้รับบริการที่ฝึกวันนี้
            </p>
            <p className="mt-3 text-5xl font-bold text-[#0F756F]">
              {data.activeToday}
            </p>
          </div>
          <div className="rounded-[30px] bg-[#FFF7E8] px-7 py-6 shadow-[0_16px_36px_rgba(139,117,56,0.08)] ring-1 ring-[#F3EAC8]">
            <p className="text-lg font-bold text-[#6A5A2D]">
              ผู้รับบริการที่ควรติดตาม
            </p>
            <p className="mt-3 text-5xl font-bold text-[#9A6A13]">
              {data.followUpCount}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[34px] bg-white px-6 py-6 shadow-[0_18px_48px_rgba(17,103,99,0.1)] ring-1 ring-[#CDEEEF] sm:px-7">
            <h2 className="text-2xl font-bold">รายชื่อผู้รับบริการ</h2>
            <div className="mt-5 grid gap-4">
              {data.patients.map((patient) => (
                <article
                  key={patient.id}
                  className="grid gap-4 rounded-[28px] bg-[#F8FEFF] p-5 ring-1 ring-[#D7EFF0] md:grid-cols-[1fr_220px]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-bold">{patient.name}</h3>
                      <span className="rounded-full bg-white px-4 py-1.5 text-base font-bold text-[#13756F] ring-1 ring-[#CDEEEF]">
                        {patient.code}
                      </span>
                      {patient.needsFollowUp ? (
                        <span className="rounded-full bg-[#FFF0E8] px-4 py-1.5 text-base font-bold text-[#A65312]">
                          ควรติดตาม
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-base font-semibold text-[#557276]">
                      ฝึกล่าสุด {formatDateTime(patient.lastSessionAt || patient.latestAssessmentDate)}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <ProgressLine
                        label="แบบทดสอบก่อนใช้งาน"
                        value={patient.assessmentPercentage}
                      />
                      <ProgressLine
                        label="แผนฝึกวันนี้"
                        value={patient.sessionPercentage}
                      />
                    </div>
                  </div>
                  <div className="flex items-center md:justify-end">
                    <Link
                      className="flex min-h-[58px] w-full items-center justify-center rounded-full bg-[#1FA89C] px-6 text-lg font-bold text-white shadow-[0_12px_26px_rgba(31,168,156,0.22)] transition hover:bg-[#178F84]"
                      href={`/therapist/patients/${patient.id}`}
                    >
                      ดูรายละเอียด
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[34px] bg-white px-6 py-6 shadow-[0_18px_48px_rgba(17,103,99,0.1)] ring-1 ring-[#CDEEEF] sm:px-7">
            <h2 className="text-2xl font-bold">session ล่าสุด</h2>
            <div className="mt-5 grid gap-4">
              {data.recentSessions.map((session) => (
                <article
                  key={session.id}
                  className="rounded-[26px] bg-[#F8FEFF] p-5 ring-1 ring-[#D7EFF0]"
                >
                  <p className="text-lg font-bold">{session.patientName}</p>
                  <p className="mt-2 text-base font-semibold text-[#13756F]">
                    {session.moduleName}
                  </p>
                  <p className="mt-2 text-base font-medium text-[#557276]">
                    {session.summary}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[#789093]">
                    {formatDateTime(session.completedAt)}
                  </p>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
