import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
export default function Layout({ children }: { children: ReactNode }) {
	if (process.env.NODE_ENV !== "development") notFound();
	return (
		<div className="[--preview-bar-height:2rem]">
			<aside className="relative z-40 h-8 bg-[#eef6ef] px-4 text-xs text-[#63786b]">
				<details className="relative mx-auto max-w-[1328px]">
					<summary className="flex h-8 w-fit cursor-pointer items-center gap-2 list-none">
						<span className="h-1.5 w-1.5 rounded-full bg-[#a0bba8]" />
						โหมดตัวอย่าง · ไม่บันทึกผล <span aria-hidden="true">⌄</span>
					</summary>
					<nav
						aria-label="เมนูดูตัวอย่าง"
						className="absolute left-0 top-8 grid min-w-56 gap-1 rounded-2xl bg-white p-3 text-base text-[#31584f] shadow-xl"
					>
						<p className="px-3 py-2 text-xs text-[#63786b]">
							ข้อมูลจำลอง ไม่ส่งคำตอบหรือเสียงเข้า Backend
						</p>
						<Link
							className="rounded-xl px-3 py-3 hover:bg-[#edf8f3]"
							href="/dev/preview"
						>
							เลือกกรณี
						</Link>
						<Link
							className="rounded-xl px-3 py-3 hover:bg-[#edf8f3]"
							href="/dev/preview/new"
						>
							คนไข้ใหม่
						</Link>
						<Link
							className="rounded-xl px-3 py-3 hover:bg-[#edf8f3]"
							href="/dev/preview/library"
						>
							Naming
						</Link>
						<Link
							className="rounded-xl px-3 py-3 hover:bg-[#edf8f3]"
							href="/dev/preview/repetition"
						>
							พูดตาม
						</Link>
						<Link
							className="rounded-xl px-3 py-3 hover:bg-[#edf8f3]"
							href="/dev/preview/feedback"
						>
							หน้ากำลังใจ
						</Link>
						<Link className="rounded-xl px-3 py-3 hover:bg-[#edf8f3]" href="/">
							หน้า Login จริง
						</Link>
					</nav>
				</details>
			</aside>
			{children}
		</div>
	);
}
