"use client";
import { Check, LayoutGrid, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { QuestionStatus } from "../services/practiceFlow";

export function QuestionDots({
	statuses,
	current,
	disabled,
	onSelect,
}: {
	statuses: QuestionStatus[];
	current: number;
	disabled?: boolean;
	onSelect: (index: number) => void;
}) {
	const [open, setOpen] = useState(false);
	const id = useId();
	const dialog = useRef<HTMLDialogElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const close = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		const element = dialog.current;
		if (!element) return;
		if (open && !element.open) {
			if (element.showModal) element.showModal();
			else element.setAttribute("open", "");
			close.current?.focus();
		}
		if (!open && element.open) element.close();
	}, [open]);
	function dismiss() {
		setOpen(false);
		trigger.current?.focus();
	}
	return (
		<div className="justify-self-end">
			<button
				ref={trigger}
				type="button"
				aria-expanded={open}
				aria-haspopup="dialog"
				aria-controls={id}
				disabled={disabled}
				onClick={() => setOpen(true)}
				className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-3 text-base font-semibold text-[#436c65] outline-none transition hover:bg-white/80 focus-visible:ring-4 focus-visible:ring-[#9eddd1] disabled:opacity-50 sm:px-4"
			>
				<LayoutGrid aria-hidden="true" className="h-5 w-5" />
				<span className="hidden min-[480px]:inline">ดูข้อทั้งหมด</span>
				<span className="sr-only min-[480px]:hidden">ดูข้อทั้งหมด</span>
			</button>
			<dialog
				ref={dialog}
				id={id}
				aria-labelledby={`${id}-title`}
				onCancel={dismiss}
				onClose={() => {
					setOpen(false);
					trigger.current?.focus();
				}}
				className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-[2rem] border-0 bg-[#fbfefd] p-6 text-[#173d3f] shadow-2xl backdrop:bg-[#173d3f]/25 sm:p-8"
			>
				<header className="mb-6 flex items-center justify-between gap-4">
					<div>
						<h2 id={`${id}-title`} className="text-2xl font-bold">
							ข้อทั้งหมด
						</h2>
						<p className="mt-2 text-base text-[#638078]">
							ทำแล้ว {statuses.filter((status) => status === "answered").length}{" "}
							/ {statuses.length}
						</p>
					</div>
					<button
						ref={close}
						type="button"
						aria-label="ปิดข้อทั้งหมด"
						onClick={dismiss}
						className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf6f2] outline-none focus-visible:ring-4 focus-visible:ring-teal-200"
					>
						<X aria-hidden="true" />
					</button>
				</header>
				<ol className="grid grid-cols-4 justify-items-center gap-3 sm:grid-cols-6 sm:gap-4">
					{statuses.map((status, index) => (
						<li key={index}>
							<button
								type="button"
								onClick={() => {
									onSelect(index);
									dismiss();
								}}
								disabled={disabled}
								aria-current={current === index ? "step" : undefined}
								aria-label={`ข้อ ${index + 1} ${status === "answered" ? "ทำแล้ว" : status === "skipped" ? "ข้ามไว้ ยังไม่ได้ทำ" : "ยังไม่ได้ทำ"}`}
								className={`relative flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold outline-none focus-visible:ring-4 focus-visible:ring-teal-200 disabled:opacity-50 sm:h-14 sm:w-14 ${status === "answered" ? "bg-[#118a82] text-white" : status === "skipped" ? "bg-[#fce9eb] text-[#923c46]" : "bg-[#edf3f0] text-[#526a66]"} ${current === index ? "ring-2 ring-[#118a82] ring-offset-4" : ""}`}
							>
								{index + 1}
								{status === "answered" && (
									<Check
										aria-hidden="true"
										className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white text-[#118a82]"
									/>
								)}
							</button>
						</li>
					))}
				</ol>
				<p className="mt-6 text-center text-sm leading-7 text-[#638078]">
					เขียว ทำแล้ว · ชมพู ข้ามไว้ · เทา ยังไม่ได้ทำ
					<br />
					กดเลขข้อเพื่อกลับไปทำ
				</p>
			</dialog>
		</div>
	);
}
