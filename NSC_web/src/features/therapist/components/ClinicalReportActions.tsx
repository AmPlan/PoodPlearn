"use client";

import { useState } from "react";

export default function ClinicalReportActions({ reportText }: { reportText: string }) {
  const [copyStatus, setCopyStatus] = useState("Copy report");

  async function handleCopy() {
    await navigator.clipboard.writeText(reportText);
    setCopyStatus("คัดลอกเรียบร้อย");
    window.setTimeout(() => setCopyStatus("Copy report"), 2000);
  }

  function handleDownload() {
    window.print();
  }

  return (
    <div className="no-print mt-4 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-full bg-[#1FA89C] px-5 py-3 text-white shadow-[0_10px_24px_rgba(31,168,156,0.22)]"
      >
        {copyStatus}
      </button>
      <button
        type="button"
        onClick={handleDownload}
        className="rounded-full border border-[#CDEEEF] bg-white px-5 py-3 text-[#13756F]"
      >
        พิมพ์ / บันทึก PDF ทั้งหมด
      </button>
    </div>
  );
}
