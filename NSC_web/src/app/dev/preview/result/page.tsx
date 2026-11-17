import Link from "next/link";
import { Check } from "lucide-react";
import {
	namingButton,
	namingPage,
} from "@/features/training/components/NamingLibrary";
export default function Page() {
	return (
		<main className={namingPage}>
			<section className="mx-auto max-w-xl rounded-3xl bg-white p-6 text-center sm:p-10">
				<Check
					aria-hidden="true"
					className="mx-auto h-24 w-24 text-[#118a82]"
				/>
				<h1 className="mt-4 text-3xl font-bold">จบตัวอย่างหน้าประเมิน</h1>
				<p className="mt-5 text-lg leading-8">ไม่มีการตรวจคะแนนหรือบันทึกผลจริง</p>
				<Link
					href="/dev/preview/returning"
					className={`${namingButton} mt-7 w-full`}
				>
					ดูกรณีหลังประเมิน
				</Link>
			</section>
		</main>
	);
}
