import { TherapistDashboard } from "@/features/therapist/components/TherapistDashboard";
import { cookies } from "next/headers";
import { getTherapistDashboardData } from "@/features/therapist/services/therapistDashboardService";
import { getBaseUrl } from "@/lib/baseUrl";

export default async function TherapistDashboardPage() {
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

  return <TherapistDashboard data={result.data} />;
}
