"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import type { TherapistPatientSummary } from "../types/therapist.types";
import {
  deletePatient,
  getTherapistDashboardData,
} from "../services/therapistDashboardService";
import PatientCodeCopyButton from "./PatientCodeCopyButton";

type TherapistPatientListProps = {
  patients: TherapistPatientSummary[];
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


export default function TherapistPatientList({ patients }: TherapistPatientListProps) {
  const router = useRouter();
  const [visiblePatients, setVisiblePatients] = useState(patients);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const displayedPatients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return visiblePatients.filter((p) => {
      if (statusFilter === "followUp" && !p.needsFollowUp) return false;
      if (!term) return true;
      return (
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.code && p.code.toLowerCase().includes(term))
      );
    });
  }, [visiblePatients, searchTerm, statusFilter]);

  useEffect(() => {
    let isActive = true;

    async function loadPatients() {
      const result = await getTherapistDashboardData();
      if (!isActive || !result.success) {
        return;
      }

      setVisiblePatients(result.data.patients);
    }

    loadPatients();

    return () => {
      isActive = false;
    };
  }, [patients]);

  async function handleDelete(patientId: string) {
    const confirmed = window.confirm("คุณแน่ใจว่าต้องการลบผู้รับบริการรายนี้? การกระทำนี้ไม่สามารถย้อนกลับได้");
    if (!confirmed) return;

    const result = await deletePatient(patientId);
    if (result.success) {
      setVisiblePatients((current) =>
        current.filter((patient) => patient.id !== patientId),
      );
      router.refresh();
      alert("ลบผู้รับบริการเรียบร้อยแล้ว");
    } else {
      alert(result.errorMessage);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อหรือรหัส"
            className="rounded-lg border border-[#D7EFF0] bg-white px-3 py-2 text-sm shadow-sm focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#D7EFF0] bg-white px-3 py-2 text-sm"
          >
            <option value="all">ทั้งหมด</option>
            <option value="followUp">ควรติดตาม</option>
          </select>
        </div>
      </div>
      {displayedPatients.map((patient) => (
        <div
          key={patient.id}
          className="rounded-[30px] bg-white px-6 py-5 shadow-[0_16px_36px_rgba(17,103,99,0.09)] ring-1 ring-[#CDEEEF]"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:items-center">
            <div>
              <p className="text-2xl font-bold text-[#123232]">{patient.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PatientCodeCopyButton patientCode={patient.code} />
              </div>
              <p className="mt-2 text-lg font-semibold text-[#557276]">
                อายุ {patient.age} ปี · ฝึกล่าสุด {formatDateTime(patient.lastSessionAt || patient.latestAssessmentDate)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 sm:justify-end">
              <Link
                href={`/therapist/patients/${patient.id}`}
                className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-[#D7EFF0] bg-white px-5 text-base font-bold text-[#13756F] hover:bg-[#F7FFFF]"
              >
                ดูรายละเอียด
              </Link>
              <Link
                href={`/therapist/patients/${patient.id}/edit`}
                className="inline-flex min-h-[50px] items-center justify-center rounded-full bg-white px-5 text-base font-bold text-[#13756F] ring-1 ring-[#CDEEEF] hover:bg-[#F7FFFF]"
              >
                แก้ไข
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(patient.id)}
                className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-[#E2B8B3] bg-[#FFEEF0] px-5 text-base font-bold text-[#B42318] hover:bg-[#FFE7E9]"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
