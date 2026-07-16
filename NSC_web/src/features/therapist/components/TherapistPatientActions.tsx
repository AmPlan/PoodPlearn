"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePatient } from "../services/therapistDashboardService";

export default function TherapistPatientActions({ patientId }: { patientId: string }) {
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm(
      "คุณแน่ใจว่าต้องการลบผู้รับบริการรายนี้? การกระทำนี้ไม่สามารถย้อนกลับได้",
    );
    if (!confirmed) return;

    const result = await deletePatient(patientId);
    if (result.success) {
      router.push("/therapist/patients");
      alert("ลบผู้รับบริการเรียบร้อยแล้ว");
    } else {
      alert(result.errorMessage);
    }
  }

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Link
        href={`/therapist/patients/${patientId}/edit`}
        className="inline-flex min-h-[58px] items-center justify-center rounded-full bg-white px-6 text-center text-lg font-bold text-[#13756F] shadow-[0_10px_24px_rgba(17,103,99,0.1)] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF]"
      >
        แก้ไขข้อมูล
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        className="min-h-[58px] rounded-full bg-[#FFEEF0] px-6 text-lg font-bold text-[#B42318] shadow-[0_10px_24px_rgba(180,51,60,0.16)] transition hover:bg-[#FFE7E9]"
      >
        ลบผู้รับบริการ
      </button>
    </div>
  );
}
