import Link from "next/link";
import { Play } from "lucide-react";
import {
	namingButton,
	namingPage,
} from "@/features/training/components/NamingLibrary";
export default function Page() {
	return (
		<main className={namingPage}>
			<section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 text-center sm:p-10">
				<h1 className="text-3xl font-bold">กิจกรรมวันนี้</h1>
				<p className="mt-4 text-2xl">เรียกชื่อภาพ</p>
				<Link
					href="/dev/preview/naming/easy-1"
					className={`${namingButton} mt-7 min-h-20 w-full gap-3`}
				>
					<Play aria-hidden="true" className="h-8 w-8" />
					เริ่มฝึก
				</Link>
				<Link
					href="/dev/preview/library"
					className="mt-6 inline-block py-3 text-lg text-[#118a82] underline"
				>
					เลือกดูชุดอื่น
				</Link>
				<p className="mt-4 text-base text-[#526a66]">
					แผนจำลองสำหรับตรวจหน้าจอ ไม่ได้เลือกจากผลประเมินจริง
				</p>
			</section>
		</main>
	);
}
