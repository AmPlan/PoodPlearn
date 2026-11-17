import Link from "next/link";
import {
	namingButton,
	namingPage,
} from "@/features/training/components/NamingLibrary";
export default function Page() {
	return (
		<main className={namingPage}>
			<section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 sm:p-10">
				<h1 className="text-3xl font-bold">ดูตัวอย่างหน้าคนไข้</h1>
				<p className="my-5 text-xl leading-9">
					ไม่ต้องใช้รหัส PN เลือกกรณีที่ต้องการตรวจหน้าจอ
				</p>
				<div className="grid gap-5">
					<Link className={`${namingButton} min-h-20`} href="/dev/preview/new">
						คนไข้ใหม่ — ก่อนประเมิน
					</Link>
					<Link
						className={`${namingButton} min-h-20`}
						href="/dev/preview/returning"
					>
						คนไข้เดิม — หลังประเมิน
					</Link>
					<Link
						className={`${namingButton} min-h-20`}
						href="/dev/preview/naming/easy-1"
					>
						เปิดหน้าฝึก Naming โดยตรง
					</Link>
				</div>
			</section>
		</main>
	);
}
