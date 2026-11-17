import type { PracticeCue } from "../hooks/usePracticeFlow";

export function PracticeFeedback({
	cue,
	onContinue,
}: {
	cue: PracticeCue | null;
	onContinue: () => void;
}) {
	if (!cue) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173d3f]/20 p-5">
			<section
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className={`w-full max-w-lg rounded-[2rem] border-4 border-white p-7 text-center shadow-xl sm:p-10 ${cue.kind === "wrong" ? "bg-[#eaf4fc]" : cue.kind === "milestone" ? "bg-[#fff9df]" : "bg-[#e5f7ef]"}`}
			>
				<div aria-hidden="true" className="text-7xl sm:text-8xl">
					{cue.kind === "correct"
						? "🌈"
						: cue.kind === "wrong"
							? "🌱"
							: cue.kind === "milestone"
								? "🌟"
								: cue.kind === "remaining"
									? "🫧"
									: "✨"}
				</div>
				<h2 className="mt-6 text-balance text-2xl font-bold leading-relaxed text-[#173d3f] sm:text-3xl">
					{cue.text}
				</h2>
				{cue.kind === "remaining" && (
					<div className="mt-5">
						<p className="text-lg text-[#52766b]">ข้อที่ยังไม่ได้ทำ</p>
						<ol
							aria-label="ข้อที่ยังไม่ได้ทำ"
							className="mt-4 flex max-h-[30dvh] flex-wrap justify-center gap-3 overflow-y-auto p-2"
						>
							{cue.remainingQuestions?.map((number, index) => (
								<li
									key={number}
									aria-label={`ข้อ ${number}${index === 0 ? " กำลังกลับไปทำ" : ""}`}
									className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold ${index === 0 ? "bg-[#118a82] text-white ring-4 ring-[#c0e7db]" : "bg-white text-[#52766b]"}`}
								>
									{number}
								</li>
							))}
						</ol>
					</div>
				)}
				<button
					type="button"
					onClick={onContinue}
					className="mt-6 min-h-14 rounded-2xl bg-white px-8 text-xl font-bold text-[#176e66] outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
				>
					{cue.kind === "remaining" ? "ไปทำต่อ" : "ต่อ"}
				</button>
			</section>
		</div>
	);
}
