import Link from "next/link";
import {
	isSetReady,
	missingImages,
	namingCatalog,
} from "../data/namingCatalog";

export const namingButton =
	"inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#118a82] px-6 py-3 text-center text-xl font-bold text-white transition hover:bg-[#0c706a] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50";
export const namingSecondary =
	"inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-[#b6d9d2] bg-white px-5 py-3 text-center text-lg font-bold text-[#176e66] hover:bg-[#edf9f5] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50";
export const namingPage =
	"min-h-dvh bg-[#edf9f6] px-4 py-6 text-[#173d3f] sm:px-8 sm:py-10";

export function NamingLibrary() {
	return (
		<main className={namingPage}>
			<div className="mx-auto max-w-6xl">
				<Link href="/patient/training/naming" className={namingSecondary}>
					ย้อนกลับ
				</Link>
				<header className="my-8">
					<p className="text-lg font-bold text-[#118a82]">คลังแบบฝึก · Naming</p>
					<h1 className="mt-2 text-3xl font-bold sm:text-4xl">
						แบบฝึกเรียกชื่อภาพ
					</h1>
					<p className="mt-3 text-lg leading-8">
						3 ระดับ · 9 ชุด · ชุดละ 15 ข้อ รวม 135 ข้อ
					</p>
					<p className="text-lg leading-8 text-[#526a66]">
						เลือกฝึกเพิ่มเติมได้ด้วยตนเอง ผลรอบนี้เก็บเฉพาะบนหน้านี้ ไม่ใช่ผลประเมินการพูด
					</p>
				</header>
				{(["easy", "medium", "hard"] as const).map((level) => {
					const sets = namingCatalog.filter((set) => set.level === level);
					return (
						<section
							key={level}
							className="mb-10"
							aria-labelledby={`${level}-heading`}
						>
							<h2 id={`${level}-heading`} className="mb-4 text-2xl font-bold">
								{sets[0].levelName} — {sets[0].category}
							</h2>
							<div className="grid gap-5 md:grid-cols-3">
								{sets.map((set) => (
									<article
										key={set.id}
										className="flex flex-col rounded-3xl border border-[#c5e2dc] bg-white p-6 shadow-sm"
									>
										<h3 className="text-2xl font-bold">ชุด {set.number}</h3>
										<p className="mt-3 text-lg">
											15 ข้อ · ภาพ{" "}
											{set.questions.length - missingImages(set).length}/15
										</p>
										<p
											className={`mt-3 text-lg font-semibold ${isSetReady(set) ? "text-[#13756f]" : "text-amber-800"}`}
										>
											{isSetReady(set)
												? "ภาพครบ · พร้อมฝึก"
												: `รอรูปภาพ ${missingImages(set).length} ข้อ`}
										</p>
										{!isSetReady(set) && (
											<p className="mt-2 text-base text-[#526a66]">
												จะเปิดฝึกเมื่อภาพครบทั้งชุด
											</p>
										)}
										{isSetReady(set) ? (
											<Link
												href={`/patient/training/naming/sets/${set.id}`}
												className={`${namingButton} mt-6`}
											>
												ดูชุดฝึก
											</Link>
										) : (
											<button disabled className={`${namingButton} mt-6`}>
												ยังไม่พร้อมฝึก
											</button>
										)}
									</article>
								))}
							</div>
						</section>
					);
				})}
			</div>
		</main>
	);
}
