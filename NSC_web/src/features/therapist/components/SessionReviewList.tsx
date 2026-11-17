"use client";

import React, { useEffect, useState } from "react";
import type { SessionResultItem } from "../types/therapistClinical.types";
import { getPatientSessionResults } from "../services/therapistClinicalService";

const SESSION_REVIEW_STORAGE_KEY = "nsc_therapist_session_reviews";

function readReviewPatches(): Record<string, Partial<SessionResultItem>> {
	if (typeof window === "undefined") {
		return {};
	}

	try {
		const rawValue = window.localStorage.getItem(SESSION_REVIEW_STORAGE_KEY);
		const value: unknown = rawValue ? JSON.parse(rawValue) : {};
		if (!value || typeof value !== "object" || Array.isArray(value)) return {};
		const safe: Record<string, Partial<SessionResultItem>> = {};
		for (const [id, raw] of Object.entries(value)) {
			if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
			const item = raw as Record<string, unknown>;
			const patch: Partial<SessionResultItem> = {};
			if (typeof item.therapistNote === "string")
				patch.therapistNote = item.therapistNote;
			if (
				["not-reviewed", "correct", "incorrect", "needs-review"].includes(
					String(item.therapistReviewStatus),
				)
			)
				patch.therapistReviewStatus =
					item.therapistReviewStatus as SessionResultItem["therapistReviewStatus"];
			safe[id] = patch;
		}
		return safe;
	} catch {
		return {};
	}
}

function writeReviewPatch(id: string, patch: Partial<SessionResultItem>) {
	if (typeof window === "undefined") {
		return false;
	}

	const current = readReviewPatches();
	try {
		window.localStorage.setItem(
			SESSION_REVIEW_STORAGE_KEY,
			JSON.stringify({
				...current,
				[id]: {
					...current[id],
					...patch,
				},
			}),
		);
		return true;
	} catch {
		return false;
	}
}

function applyReviewPatches(items: SessionResultItem[]) {
	const patches = readReviewPatches();

	return items.map((item) => ({
		...item,
		...patches[item.id],
	}));
}

function getReviewStatusLabel(
	status: SessionResultItem["therapistReviewStatus"],
) {
	if (status === "correct") {
		return "ถูกต้อง";
	}

	if (status === "incorrect") {
		return "ผิด";
	}

	if (status === "needs-review") {
		return "ต้องตรวจซ้ำ";
	}

	return "ยังไม่ตรวจ";
}

export function SessionReviewList({
	patientId,
	initialItems = [],
}: {
	patientId: string;
	initialItems?: SessionResultItem[];
}) {
	const [items, setItems] = useState<SessionResultItem[]>(initialItems);
	const [error, setError] = useState("");
	const [storageError, setStorageError] = useState(false);
	const [loading, setLoading] = useState(true);
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		let active = true;
		async function load() {
			const res = await getPatientSessionResults(patientId);
			if (!active) return;
			if (res.success) setItems(applyReviewPatches(res.data));
			else setError(res.errorMessage);
			setLoading(false);
		}
		load();
		return () => {
			active = false;
		};
	}, [patientId, attempt]);

	function updateItem(id: string, patch: Partial<SessionResultItem>) {
		setItems((prev) =>
			prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
		);
		setStorageError(!writeReviewPatch(id, patch));
	}

	return (
		<div>
			<h3 className="mb-3 text-xl font-bold">ตรวจผลจากเสียงผู้รับบริการ</h3>
			<p className="mb-3 text-sm text-[#557276]">
				ผลจาก AI เป็นข้อมูลเบื้องต้น กรุณาตรวจซ้ำจากเสียงผู้รับบริการ
			</p>
			<p className="mb-3 text-sm text-[#557276]">
				สถานะตรวจและโน้ตในหน้านี้เก็บเฉพาะเบราว์เซอร์นี้ ยังไม่ส่งเข้า Backend
			</p>
			{storageError && (
				<p role="alert" className="mb-3 text-amber-900">
					ยังบันทึกโน้ตลงเครื่องนี้ไม่ได้ กรุณาสำรองข้อความไว้ก่อน
				</p>
			)}
			{loading && <p role="status">กำลังโหลดประวัติการฝึก…</p>}
			{error && (
				<div role="alert" className="mb-3 text-amber-900">
					{error}
					<button
						className="ml-3 min-h-12 rounded-xl border px-4"
						onClick={() => {
							setError("");
							setLoading(true);
							setAttempt((value) => value + 1);
						}}
					>
						ลองโหลดใหม่
					</button>
				</div>
			)}
			{items.length === 0 && !error && !loading ? (
				<div className="rounded-[22px] bg-[#F8FEFF] px-5 py-5 text-sm font-semibold text-[#557276] ring-1 ring-[#D7EFF0]">
					ยังไม่มีประวัติการฝึกที่บันทึกไว้สำหรับผู้รับบริการรายนี้
				</div>
			) : null}
			<div className="space-y-4">
				{items.map((it) => (
					<div
						key={it.id}
						className="rounded-lg border border-[#E6F6F4] p-4 bg-white"
					>
						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm text-[#45686A]">{it.date}</div>
								<div className="mt-1 text-lg font-bold">
									{it.expectedAnswer}
								</div>
							</div>
							<div className="no-print flex items-center gap-3">
								{it.audioUrl ? (
									<audio controls src={it.audioUrl} />
								) : (
									<span className="rounded-full bg-[#F2FBFB] px-4 py-2 text-sm font-bold text-[#12847D] ring-1 ring-[#CDEEEF]">
										รอไฟล์เสียงจากระบบ
									</span>
								)}
							</div>
						</div>

						<div className="mt-3 grid gap-2">
							<div className="text-sm text-[#557276]">
								ASR: {it.asrTranscript || "รอข้อความถอดเสียงจากระบบ"}
							</div>
							<div className="text-sm">
								ผลตรวจจากระบบ:{" "}
								{it.aiCorrect === true
									? "ถูกต้อง"
									: it.aiCorrect === false
										? "ไม่ถูกต้อง"
										: "รอผลตรวจจากระบบ"}
							</div>
							<div className="no-print flex items-center gap-2">
								<label className="text-sm">สถานะตรวจของนักบำบัด:</label>
								<select
									aria-label="สถานะตรวจสอบโดยนักแก้ไขการพูด"
									value={it.therapistReviewStatus ?? "not-reviewed"}
									onChange={(e) =>
										updateItem(it.id, {
											therapistReviewStatus: e.target.value as
												| "not-reviewed"
												| "correct"
												| "incorrect"
												| "needs-review",
										})
									}
									className="rounded border p-1"
								>
									<option value="not-reviewed">ยังไม่ตรวจ</option>
									<option value="correct">ถูกต้อง</option>
									<option value="incorrect">ผิด</option>
									<option value="needs-review">ต้องตรวจซ้ำ</option>
								</select>
							</div>
							<p className="print-only text-sm">
								สถานะตรวจของนักบำบัด:{" "}
								{getReviewStatusLabel(it.therapistReviewStatus)}
							</p>
							<div className="no-print">
								<textarea
									aria-label="โน้ตจากนักแก้ไขการพูด"
									placeholder="โน้ตจากนักแก้ไขการพูด"
									value={it.therapistNote ?? ""}
									onChange={(e) =>
										updateItem(it.id, { therapistNote: e.target.value })
									}
									className="w-full rounded border p-2"
								/>
							</div>
							<p className="print-only text-sm">
								โน้ตจากนักแก้ไขการพูด: {it.therapistNote || "-"}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default SessionReviewList;
