// NOTE: This route is a dev/internal preview of the PN002 naming animal sets.
// Patient-facing flow should start from /patient/training/today and follow assigned training plans.
import PatientRouteGuard from "@/components/PatientRouteGuard";
import { NamingAnimalSets } from "@/features/training/components/NamingAnimalSets";
import { getNamingAnimalSets } from "@/features/training/services/pn002NamingService";

export default async function PatientNamingAnimalsPage() {
  const result = await getNamingAnimalSets();

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
    <>
      <PatientRouteGuard />
      <NamingAnimalSets sets={result.data} />
    </>
  );
}
