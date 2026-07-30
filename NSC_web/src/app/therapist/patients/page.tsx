import { getTherapistDashboardData } from "@/features/therapist/services/therapistDashboardService";
import { cookies } from "next/headers"
import { getBaseUrl } from "@/lib/baseUrl";
import TherapistPatientList from "@/features/therapist/components/TherapistPatientList";
import Link from "next/link";

export default async function TherapistPatientsPage() {
  const origin = getBaseUrl();
  const cookieHeader = (await cookies()).toString();
  
  const result = await getTherapistDashboardData(undefined, { origin, cookieHeader });

  if (!result.success) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#EFFBFD] p-8">
        <p className="rounded-[32px] bg-white px-8 py-7 text-center text-2xl font-bold text-[#B42318] shadow-[0_18px_45px_rgba(24,112,108,0.08)]">
          {result.errorMessage}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-5 py-6 text-[#123232] sm:px-8">
      <div className="mx-auto w-full max-w-[980px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-white px-7 text-lg font-bold text-[#13756F] shadow-[0_10px_24px_rgba(17,103,99,0.1)] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF]"
              href="/therapist/dashboard"
            >
              กลับแดชบอร์ด
            </Link>
            <h1 className="mt-5 text-[2.4rem] font-bold leading-tight sm:text-[3rem]">
              รายชื่อผู้รับบริการ
            </h1>
          </div>
          <Link
            href="/therapist/patients/new"
            className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-[#1FA89C] px-7 text-lg font-bold text-white shadow-[0_10px_24px_rgba(31,168,156,0.22)] transition hover:bg-[#178F84]"
          >
            เพิ่มผู้รับบริการใหม่
          </Link>
        </div>
        <TherapistPatientList patients={result.data.patients} />
      </div>
    </main>
  );
}
