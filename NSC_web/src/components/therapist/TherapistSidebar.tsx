"use client";
import { Home, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{ label: "แดชบอร์ด", href: "/therapist/dashboard", icon: "home" },
	{ label: "รายการผู้รับบริการ", href: "/therapist/patients", icon: "users" },
];

export default function TherapistSidebar() {
	const pathname = usePathname();

	return (
		<aside className="no-print sticky top-3 hidden max-h-[calc(100dvh-1.5rem)] w-59 shrink-0 overflow-y-auto rounded-[28px] border border-[#D7EFF0] bg-white p-4 shadow-[0_18px_48px_rgba(24,112,108,0.08)] lg:block xl:w-63">
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
							className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold transition ${
								active
									? "bg-[#EAF9F8] text-[#0F756F] shadow-sm ring-1 ring-[#CDEEEF]"
									: "text-[#45686A] hover:bg-[#F7FFFF]"
							}`}
						>
							<span aria-hidden className="shrink-0">
								{item.icon === "home" ? (
									<Home size={20} strokeWidth={1.5} className="text-current" />
								) : (
									<Users size={20} strokeWidth={1.5} className="text-current" />
								)}
							</span>{" "}
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>

			<div className="mt-6 hidden rounded-[22px] bg-[#FFF7D6] p-4 ring-1 ring-[#F3E0A8] xl:block">
				<div className="flex items-start gap-3">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						className="shrink-0 text-[#8A6C00]"
					>
						<path
							d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
							stroke="currentColor"
							strokeWidth="0.5"
							fill="#FFF2B8"
						/>
						<path
							d="M12 9v4"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<circle cx="12" cy="17" r="1" fill="#8A6C00" />
					</svg>
					<div>
						<p className="text-sm font-bold text-[#8A6C00]">ข้อควรระวัง</p>
						<p className="mt-1 text-sm leading-6 text-[#6A5A2D]">
							รายงานจากระบบเป็นข้อมูลช่วยสรุปจากผลการฝึกที่บันทึกไว้
							นักแก้ไขการพูดควรตรวจทานก่อนใช้งานจริง
						</p>
					</div>
				</div>
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