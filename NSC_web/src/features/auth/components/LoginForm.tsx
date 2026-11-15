"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Heart, LoaderCircle, LockKeyhole, MessageCircleHeart, ShieldCheck, Stethoscope } from "lucide-react";
import { saveAuthSession } from "../services/authSession";
import { loginPatient, PATIENT_CODE_PATTERN, startTherapistGoogleLogin } from "../services/loginPageService";

export function LoginForm() {
  const router = useRouter();
  const codeId = useId();
  const codeInput = useRef<HTMLInputElement>(null);
  const patientPending = useRef(false);
  const googlePending = useRef(false);
  const [code, setCode] = useState("");
  const [patientError, setPatientError] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [patientLoading, setPatientLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handlePatientLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (patientPending.current) return;
    const normalized = code.trim().toUpperCase();
    if (!normalized || !PATIENT_CODE_PATTERN.test(normalized)) {
      setPatientError(!normalized ? "กรุณากรอกรหัสคนไข้" : "กรอกรหัส PN ตามด้วยตัวเลขอย่างน้อย 3 หลัก เช่น PN001");
      codeInput.current?.focus();
      return;
    }
    patientPending.current = true;
    setPatientLoading(true);
    setPatientError("");
    try {
      const result = await loginPatient(normalized);
      if (!result.success) { setPatientError(result.errorMessage); return; }
      saveAuthSession(result.user);
      router.push(result.redirectPath);
    } catch {
      setPatientError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      patientPending.current = false;
      setPatientLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (googlePending.current) return;
    googlePending.current = true;
    setGoogleLoading(true);
    setGoogleError("");
    try {
      const authorizationUrl = await startTherapistGoogleLogin();
      window.location.assign(authorizationUrl);
    } catch (error) {
      setGoogleError(error instanceof Error && error.message.startsWith("ระบบ") || error instanceof Error && error.message.startsWith("เข้าสู่ระบบ")
        ? error.message : "เชื่อมต่อ Google ไม่ได้ กรุณาลองอีกครั้งในภายหลัง");
      googlePending.current = false;
      setGoogleLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,#f7fffd_0%,#e5f7f4_55%,#d7efec_100%)] px-4 py-10 text-[#173d3f] sm:px-8 sm:py-12">
      <header className="mb-9 text-center sm:mb-12">
        <div className="flex items-center justify-center gap-3 text-[#118a82]">
          <MessageCircleHeart aria-hidden="true" className="h-12 w-12 sm:h-16 sm:w-16" strokeWidth={1.7} />
          <h1 className="text-4xl font-extrabold sm:text-5xl">พูดเพลิน</h1>
        </div>
        <p className="mt-4 text-xl font-semibold">ทุกคำพูด คือก้าวเล็ก ๆ ที่สำคัญ</p>
        <p className="mt-2 text-lg text-[#526a6a]">เลือกเข้าสู่ระบบตามบทบาทของคุณ</p>
      </header>

      <div className="grid w-full max-w-6xl gap-6 md:grid-cols-2 lg:gap-8">
        <section aria-labelledby="patient-title" className="flex flex-col rounded-3xl border border-[#b9ded8] bg-white p-6 shadow-[0_16px_50px_#21675d0d] sm:p-9 lg:p-10">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e2f6ef] text-[#118a82]"><Heart aria-hidden="true" className="h-8 w-8" /></div>
          <p className="mb-2 text-base font-bold text-[#118a82]">ฝึกพูดไปด้วยกัน</p>
          <h2 id="patient-title" className="text-3xl font-extrabold">คนไข้</h2>
          <p className="mt-3 text-lg leading-8 text-[#526a6a]">พร้อมเริ่มฝึกแล้วใช่ไหม? ใช้รหัสที่ได้รับจากนักแก้ไขการพูดเพื่อเข้าสู่ระบบ</p>
          <form onSubmit={handlePatientLogin} noValidate aria-busy={patientLoading} className="mt-7 flex flex-1 flex-col">
            <label htmlFor={codeId} className="mb-3 text-lg font-bold">รหัสคนไข้ (PN)</label>
            <div className={`flex min-h-16 items-center gap-3 rounded-xl border-2 bg-[#fcfefd] px-4 focus-within:ring-4 focus-within:ring-[#118a82]/15 ${patientError ? "border-red-400" : "border-[#c8ded9] focus-within:border-[#118a82]"}`}>
              <LockKeyhole aria-hidden="true" className="h-6 w-6 shrink-0 text-[#6a8c86]" />
              <input ref={codeInput} id={codeId} name="patientCode" value={code} onChange={(event) => { setCode(event.target.value.toUpperCase()); setPatientError(""); }} disabled={patientLoading} type="text" autoComplete="username" autoCapitalize="characters" spellCheck={false} placeholder="เช่น PN001" aria-invalid={Boolean(patientError)} aria-describedby={`${codeId}-hint${patientError ? ` ${codeId}-error` : ""}`} className="h-16 w-full min-w-0 bg-transparent text-2xl font-semibold tracking-wider outline-none placeholder:text-[#91a5a0] disabled:opacity-60" />
            </div>
            <p id={`${codeId}-hint`} className="mt-3 text-base leading-7 text-[#526a6a]">รหัส PN ตามด้วยตัวเลข เช่น PN001<br />หากยังไม่มีรหัส กรุณาติดต่อนักแก้ไขการพูดของคุณ</p>
            <div aria-live="polite" aria-atomic="true">{patientError && <p id={`${codeId}-error`} role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-lg text-red-800">{patientError}</p>}</div>
            <button type="submit" disabled={patientLoading} className="mt-7 flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-[#118a82] px-5 py-4 text-xl font-bold text-white shadow-lg shadow-teal-900/10 transition hover:bg-[#0c706a] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#118a82] disabled:cursor-wait disabled:opacity-70">
              {patientLoading ? <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" /> : <ArrowRight aria-hidden="true" className="h-6 w-6" />}
              {patientLoading ? "กำลังเข้าสู่ระบบ…" : "เข้าเริ่มฝึก"}
            </button>
          </form>
        </section>

        <section aria-labelledby="therapist-title" className="flex flex-col rounded-3xl border border-[#b9ded8] bg-[#f4fcfa] p-6 shadow-[0_16px_50px_#21675d0d] sm:p-9 lg:p-10">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#dcefeb] text-[#118a82]"><Stethoscope aria-hidden="true" className="h-8 w-8" /></div>
          <p className="mb-2 text-base font-bold text-[#118a82]">ดูแลทุกก้าวของการฝึก</p>
          <h2 id="therapist-title" className="text-3xl font-extrabold">นักแก้ไขการพูด</h2>
          <p className="mt-3 text-lg leading-8 text-[#526a6a]">เข้าสู่ระบบเพื่อจัดการแผนการฝึก และติดตามความก้าวหน้าของคนไข้</p>
          <div className="mt-7 flex flex-1 flex-col" aria-busy={googleLoading}>
            <div className="rounded-2xl border border-[#d0e7e1] bg-white/80 p-5">
              <p className="text-lg font-bold">ใช้บัญชี Gmail ของคุณ</p>
              <p className="mt-2 text-lg leading-8 text-[#526a6a]">รองรับเฉพาะบัญชี @gmail.com ที่ได้รับสิทธิ์นักแก้ไขการพูดจากผู้ดูแลระบบ</p>
            </div>
            <div aria-live="polite" aria-atomic="true">{googleError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-lg text-red-800">{googleError}</p>}</div>
            <button type="button" onClick={handleGoogleLogin} disabled={googleLoading} className="mt-7 flex min-h-16 w-full items-center justify-center gap-3 rounded-xl border-2 border-[#9fc8bf] bg-white px-4 py-4 text-xl font-bold text-[#234c45] transition hover:border-[#118a82] hover:bg-[#e8f6f1] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#118a82] disabled:cursor-wait disabled:opacity-70">
              {googleLoading ? <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" /> : <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5L18.7 4.6A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>}
              {googleLoading ? "กำลังเชื่อมต่อ Google…" : "เข้าสู่ระบบด้วย Google"}
            </button>
            <p className="mt-4 text-center text-base leading-7 text-[#526a6a]">หากเข้าใช้งานไม่ได้ กรุณาติดต่อผู้ดูแลระบบ</p>
          </div>
        </section>
      </div>
      <footer className="mt-8 text-center text-base leading-7 text-[#526a6a]">
        <p className="flex items-center justify-center gap-2"><ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0" />ข้อมูลของคุณจะถูกเก็บรักษาเป็นความลับ</p>
        <p className="mt-2">PoodPlearn © 2026 · พูดเพลิน</p>
      </footer>
    </main>
  );
}
