export default function TherapistPatientDetailLoading() {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] p-6 text-[#123232]">
      <div className="mx-auto grid h-full max-w-[1280px] gap-4">
        <div className="h-36 animate-pulse rounded-[28px] bg-white shadow-sm ring-1 ring-[#CDEEEF]" />
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
          <div className="h-96 animate-pulse rounded-[26px] bg-white ring-1 ring-[#CDEEEF]" />
          <div className="h-96 animate-pulse rounded-[26px] bg-white ring-1 ring-[#CDEEEF]" />
          <div className="h-96 animate-pulse rounded-[26px] bg-white ring-1 ring-[#CDEEEF]" />
        </div>
      </div>
    </main>
  );
}
