import { ReactNode } from "react";
import TherapistSidebar from "@/components/therapist/TherapistSidebar";

export default function TherapistLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-[#EAF9F8] text-[#123232]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1800px] min-w-0 gap-4 px-3 py-3 sm:px-5 lg:px-6">
        <TherapistSidebar />
        <div className="min-w-0 flex-1 overflow-x-clip rounded-[30px] bg-white shadow-[0_24px_80px_rgba(24,112,108,0.08)]">
          {children}
        </div>
      </div>
    </div>
  );
}
