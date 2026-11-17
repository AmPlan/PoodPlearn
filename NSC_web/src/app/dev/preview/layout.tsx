import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
	if (process.env.NODE_ENV !== "development") notFound();
	return (
		<>
			<aside className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-base text-amber-950">
				<strong>
					ตัวอย่าง Frontend · ข้อมูลจำลอง · ไม่ส่งคำตอบหรือเสียงเข้า Backend
				</strong>
				<nav
					aria-label="เมนูดูตัวอย่าง"
					className="mt-2 flex flex-wrap justify-center gap-4"
				>
					<Link className="underline" href="/dev/preview">
						เลือกกรณี
					</Link>
					<Link className="underline" href="/dev/preview/new">
						คนไข้ใหม่
					</Link>
					<Link className="underline" href="/dev/preview/library">
						Naming
					</Link>
					<Link className="underline" href="/">
						หน้า Login จริง
					</Link>
				</nav>
			</aside>
			{children}
		</>
	);
}
