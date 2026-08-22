"use client";

import { useState } from "react";

type PatientCodeCopyButtonProps = {
  patientCode: string;
};

export default function PatientCodeCopyButton({
  patientCode,
}: PatientCodeCopyButtonProps) {
  const [copyStatus, setCopyStatus] = useState("");

  async function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(patientCode);
    setCopyStatus("คัดลอกรหัสแล้ว");
  }

  return (
    <button
      type="button"
      className="inline-flex min-h-[38px] items-center justify-center rounded-full bg-[#F2FBFB] px-4 text-sm font-bold text-[#13756F] ring-1 ring-[#CDEEEF] transition hover:bg-[#F7FFFF]"
      onClick={handleCopy}
    >
      {copyStatus || `Patient Code ${patientCode}`}
    </button>
  );
}
