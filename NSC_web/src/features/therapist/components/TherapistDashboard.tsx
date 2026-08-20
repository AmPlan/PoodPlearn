"use client";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import type { TherapistDashboardData } from "../types/therapist.types";
import PatientCodeCopyButton from "./PatientCodeCopyButton";

type TherapistDashboardProps = {
	data: TherapistDashboardData;
};

function formatDateTime(value: string | undefined) {
	if (value === undefined) {
		return "-";
	}
	return new Intl.DateTimeFormat("th-TH", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function ProgressLine({ label, value }: { label: string; value: number }) {
	return (
		<div>
			{/* Reduced bottom margin from mb-2 to mb-1.5 for a tighter label */}
			<div className="mb-1.5 flex items-center justify-between text-base font-bold text-[#45686A]">
				<span>{label}</span>
				{/* cSpell:ignore tabular-nums */}
				<span className="w-14 text-right tabular-nums">{value}%</span>
			</div>
			{/* Slightly reduced bar height (h-3 to h-2.5) to look less bulky */}
			<div className="h-2.5 overflow-hidden rounded-full bg-[#DDF2F3]">
				<div
					className="h-full rounded-full bg-[#1FA89C]"
					style={{ width: `${value}%` }}
				/>
			</div>
		</div>
	);
}

export function TherapistDashboard({ data }: TherapistDashboardProps) {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const filteredPatients = useMemo(() => {
		const term = search.trim().toLowerCase();
		return data.patients.filter((p) => {
			if (statusFilter === "followUp" && !p.needsFollowUp) return false;
			if (!term) return true;
			return (
				(p.name && p.name.toLowerCase().includes(term)) ||
				(p.code && p.code.toLowerCase().includes(term))
			);
		});
	}, [data.patients, search, statusFilter]);

	return (
		<main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-4 py-5 text-[#123232] sm:px-6">
			<div className="mx-auto w-full max-w-310">
				{/* Reduced header margin from mb-7 to mb-5 */}
				<header className="mb-5">
					<div>
						<h1 className="text-[2.4rem] font-bold leading-tight sm:text-[3rem]">
							แดชบอร์ดนักแก้ไขการพูด
						</h1>
					</div>
				</header>

				<section className="grid gap-4 md:grid-cols-3">
					{/* Reduced card padding from py-6 to py-4, and px-7 to px-6 */}
					<div className="rounded-[28px] bg-white px-6 py-4 shadow-[0_16px_36px_rgba(17,103,99,0.09)] ring-1 ring-[#CDEEEF]">
						<p className="text-lg font-bold text-[#557276]">ผู้รับบริการทั้งหมด</p>
						{/* Tightened number spacing from mt-3 to mt-1 */}
						<p className="mt-1 text-6xl font-extrabold text-[#0F756F]">
							{data.totalPatients}
						</p>
					</div>
					<div className="rounded-[28px] bg-white px-6 py-4 shadow-[0_16px_36px_rgba(17,103,99,0.09)] ring-1 ring-[#E6F0FF]">
						<p className="text-lg font-bold text-[#557276]">ผู้รับบริการที่ฝึกวันนี้</p>
						<p className="mt-1 text-6xl font-extrabold text-[#0F5FAF]">
							{data.activeToday}
						</p>
					</div>
					<div className="rounded-[28px] bg-[#FFF7E8] px-6 py-4 shadow-[0_16px_36px_rgba(139,117,56,0.08)] ring-1 ring-[#F3EAC8]">
						<p className="text-lg font-bold text-[#6A5A2D]">
							ผู้รับบริการที่ควรติดตาม
						</p>
						<p className="mt-1 text-6xl font-extrabold text-[#7C4F08]">
							{data.followUpCount}
						</p>
					</div>
				</section>

				{/* Reduced top margin from mt-8/lg:mt-10 to mt-6, gap from gap-6 to gap-5 */}
				<section className="mt-6 grid gap-5 lg:grid-cols-[2fr_0.75fr]">
					<div className="rounded-[30px] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(17,103,99,0.1)] ring-1 ring-[#CDEEEF] sm:px-6">
						<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
							<h2 className="text-2xl font-bold">รายชื่อผู้รับบริการ</h2>
							<div className="flex flex-wrap items-center gap-3">
								<input
									type="search"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="ค้นหาชื่อหรือรหัส"
									className="rounded-lg border border-[#D7EFF0] bg-white px-3 py-2 text-sm shadow-sm focus:outline-none"
								/>
								<select
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
									className="rounded-lg border border-[#D7EFF0] bg-white px-3 py-2 text-sm"
								>
									<option value="all">ทั้งหมด</option>
									<option value="followUp">ควรติดตาม</option>
								</select>
							</div>
						</div>
						{/* Patient list */}
						<div className="mt-4 grid gap-3">
								{filteredPatients.map((patient) => (
									<article
										key={patient.id}
										// Reduced card padding from p-6 to p-4, reduced gap from gap-5 to gap-4
										className="grid gap-4 rounded-3xl bg-[#F8FEFF] p-5 ring-1 ring-[#D7EFF0] md:grid-cols-[1fr_200px]"
									>
										<div>
											<div className="flex flex-wrap items-center gap-2">
												<h3 className="text-2xl font-bold">{patient.name}</h3>
												<PatientCodeCopyButton patientCode={patient.code} />
												{patient.needsFollowUp ? (
													<span className="rounded-full bg-[#FFF0E8] px-3 py-1 text-sm font-bold text-[#A65312]">
														ควรติดตาม
													</span>
												) : null}
											</div>
											{/* Reduced margin from mt-2 to mt-1 */}
											<p className="mt-1 text-base font-semibold text-[#557276]">
												ฝึกล่าสุด{" "}
												{formatDateTime(
													patient.lastSessionAt || patient.latestAssessmentDate,
												)}
											</p>
											{/* Tightened gap between progress bars and text from mt-6 to mt-4 */}
											<div className="mt-4 grid gap-4 sm:grid-cols-2">
												<ProgressLine
													label="ทดสอบก่อนใช้"
													value={patient.assessmentPercentage}
												/>
												<ProgressLine
													label="แผนฝึกวันนี้"
													value={patient.sessionPercentage}
												/>
											</div>
										</div>
										<div className="flex items-center md:justify-end md:self-stretch">
											<Link
												// Reduced button height slightly (min-h-[58px] -> min-h-12.5) to remove empty space inside the button
												className="flex min-h-12.5 w-full items-center justify-center rounded-full border border-[#D7EFF0] bg-white px-5 text-lg font-bold text-[#13756F] hover:bg-[#F7FFFF]"
												href={`/therapist/patients/${patient.id}`}
											>
												ดูรายละเอียด
											</Link>
										</div>
									</article>
								))}
						</div>
					</div>

					<aside className="rounded-[30px] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(17,103,99,0.1)] ring-1 ring-[#CDEEEF] sm:px-6">
						<h2 className="text-2xl font-bold">ประวัติการฝึกล่าสุด</h2>
						<div className="mt-4 grid gap-2">
							{data.recentSessions.map((session) => (
								<article
									key={session.id}
									// Reduced padding from p-5 to p-3 to condense whitespace
									className="rounded-[22px] bg-[#F8FEFF] p-3 ring-1 ring-[#D7EFF0]"
								>
									<p className="text-lg font-bold">{session.patientName}</p>
									{/* Tightened all margins from mt-2/mt-3 to mt-1/mt-2 */}
									<p className="mt-1 text-base font-semibold text-[#13756F]">
										{session.moduleName}
									</p>
									<p className="mt-1 text-base font-medium text-[#557276]">
										{session.summary}
									</p>
									<p className="mt-2 text-sm font-semibold text-[#789093]">
										{formatDateTime(session.completedAt)}
									</p>
								</article>
							))}
						</div>
					</aside>
				</section>
			</div>
		</main>
	);
}
