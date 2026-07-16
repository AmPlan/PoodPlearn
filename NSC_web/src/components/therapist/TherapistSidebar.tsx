"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "แดชบอร์ด", href: "/therapist/dashboard" },
  { label: "รายการผู้รับบริการ", href: "/therapist/patients" },
];

export default function TherapistSidebar() {
  const pathname = usePathname();

  return (
    <aside className="no-print sticky top-3 hidden max-h-[calc(100dvh-1.5rem)] w-[236px] shrink-0 overflow-y-auto rounded-[28px] border border-[#D7EFF0] bg-white p-4 shadow-[0_18px_48px_rgba(24,112,108,0.08)] lg:block xl:w-[252px]">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#12847D]">
          ระบบนักแก้ไขการพูด
        </p>
        <h2 className="mt-3 text-2xl font-bold text-[#123232]">Therapist</h2>
        <p className="mt-2 text-sm leading-6 text-[#557276]">
          ดูแล ติดตาม และพิมพ์รายงานผลการฝึกของผู้รับบริการ
        </p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-2xl px-4 py-3 text-base font-semibold transition ${
                active
                  ? "bg-[#EAF9F8] text-[#0F756F] shadow-sm ring-1 ring-[#CDEEEF]"
                  : "text-[#45686A] hover:bg-[#F7FFFF]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 hidden rounded-[22px] bg-[#F6FEFF] p-4 ring-1 ring-[#D7EFF0] xl:block">
        <p className="text-sm font-bold text-[#12847D]">ข้อควรระวัง</p>
        <p className="mt-2 text-sm leading-6 text-[#557276]">
          รายงานจากระบบเป็นข้อมูลช่วยสรุปจากผลการฝึกที่บันทึกไว้
          นักแก้ไขการพูดควรตรวจทานก่อนใช้งานจริง
        </p>
      </div>

      <Link
        href="/"
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#1FA89C] px-4 py-3 text-base font-bold text-white shadow-[0_10px_24px_rgba(31,168,156,0.22)] transition hover:bg-[#178F84]"
      >
        ออกจากระบบ
      </Link>
    </aside>
  );
}