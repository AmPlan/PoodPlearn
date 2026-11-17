import Link from "next/link";
import { ArrowLeft, Apple, Armchair, PawPrint } from "lucide-react";
import { isSetReady, namingCatalog } from "../data/namingCatalog";

export const namingButton =
	"inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#118a82] px-6 py-3 text-center text-xl font-bold text-white transition hover:bg-[#0c706a] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50";
export const namingSecondary =
	"inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-[#b6d9d2] bg-white px-5 py-3 text-center text-lg font-bold text-[#176e66] hover:bg-[#edf9f5] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50";
export const namingPage =
	"min-h-dvh bg-[#edf9f6] px-4 py-6 text-[#173d3f] sm:px-8 sm:py-10";

export function NamingLibrary({
	backHref = "/patient/training/naming",
	setHrefPrefix = "/patient/training/naming/sets",
}: {
	backHref?: string;
	setHrefPrefix?: string;
} = {}) {
	return (
		<main className={namingPage}>
			<div className="mx-auto max-w-5xl">
				<Link href={backHref} className={`${namingSecondary} gap-2`}>
					<ArrowLeft aria-hidden="true" />
					กลับ
				</Link>
				<h1 className="my-6 text-3xl font-bold">เรียกชื่อภาพ</h1>
				{(["easy", "medium", "hard"] as const).map((level) => {
					const sets = namingCatalog.filter((set) => set.level === level);
					const Icon =
						level === "easy" ? PawPrint : level === "medium" ? Armchair : Apple;
					return (
						<section
							key={level}
							className="mb-8"
							aria-labelledby={`${level}-heading`}
						>
							<h2
								id={`${level}-heading`}
								className="mb-4 flex items-center gap-3 text-2xl font-bold"
							>
								<Icon aria-hidden="true" className="h-10 w-10 text-[#118a82]" />
								{sets[0].category}
							</h2>
							<div className="grid gap-4 sm:grid-cols-3">
								{sets.map((set) => (
									<article
										key={set.id}
										className="rounded-3xl border border-[#c5e2dc] bg-white p-5 text-center shadow-sm"
									>
										<h3 className="text-2xl font-bold">ชุด {set.number}</h3>
										<p className="mt-2 text-lg">15 ข้อ</p>
										{isSetReady(set) ? (
											<Link
												href={`${setHrefPrefix}/${set.id}`}
												className={`${namingButton} mt-4 w-full`}
												aria-label={`${set.category} ชุด ${set.number}`}
											>
												เลือก
											</Link>
										) : (
											<button
												disabled
												className={`${namingButton} mt-4 w-full`}
											>
												รอรูปภาพ
											</button>
										)}
									</article>
								))}
							</div>
						</section>
					);
				})}
				<details className="text-base leading-7 text-[#526a66]">
					<summary className="cursor-pointer py-3">ข้อมูลสำหรับผู้ดูแล</summary>
					<p>
						9 ชุด รวม 135 ข้อ การเลือกจากคลังเป็นการฝึกเพิ่มเติม ไม่ใช่แผนจากผลประเมิน
						ภาพยังขาดผ้าเช็ดตัว 1 ภาพ ของใช้ชุด 3 จึงยังไม่เปิดฝึก
					</p>
				</details>
			</div>
		</main>
	);
}
