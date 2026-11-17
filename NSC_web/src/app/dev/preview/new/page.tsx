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
				<h1 className="text-3xl font-bold">แบบประเมินมาตรฐาน</h1>
				<p className="mt-4 text-xl">ครั้งแรก</p>
				<Link
					href="/dev/preview/assessment"
					className={`${namingButton} mt-7 min-h-20 w-full gap-3`}
				>
					<Play aria-hidden="true" className="h-8 w-8" />
					เริ่มประเมิน
				</Link>
				<p className="mt-6 text-base leading-8 text-[#526a66]">
					แบบประเมินครบ 30 ข้อตามรายการที่ให้มา · โหมดดู Frontend ยังไม่ตรวจคะแนนจริง
					และบางข้อยังรอเสียงหรือตัวเลือกภาพ
				</p>
			</section>
		</main>
	);
}
