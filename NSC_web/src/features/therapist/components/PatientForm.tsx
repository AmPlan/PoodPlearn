"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { PatientProfile } from "../types/therapist.types";
import { formatThaiBirthDate } from "../utils/dateFormat";
import {
  generatePatientCode,
  isPatientCodeUnique,
  normalizePatientCode,
  validatePatientCodeFormat,
} from "../services/therapistDashboardService";

type PatientFormMode = "create" | "edit";

type PatientFormProps = {
  mode: PatientFormMode;
  initialValues: PatientProfile;
  onSubmit: (profile: PatientProfile) => Promise<boolean>;
  cancelHref: string;
};

type PatientFormErrors = Partial<Record<keyof PatientProfile, string>>;

const inputClass =
  "w-full rounded-xl border border-[#D7EFF0] bg-white px-4 py-3 text-[#123232] outline-none transition focus:border-[#1FA89C] focus:ring-4 focus:ring-[#1FA89C]/15 disabled:bg-[#EEF6F7] disabled:text-[#7A9294]";

const familyStatusOptions = ["มีครอบครัว", "อยู่คนเดียว", "อยู่กับญาติ", "อื่น ๆ"];
const genderOptions = ["ชาย", "หญิง", "อื่น ๆ"];

// --- Helper Functions for Buddhist Year Conversion ---
function toBuddhistYear(dateString: string): string {
  if (!dateString) return "";
  return dateString.replace(/^(\d{4})/, (yearStr) => {
    const year = parseInt(yearStr, 10);
    // Convert to Buddhist if the underlying data is Gregorian
    if (year >= 1800 && year < 2400) {
      return (year + 543).toString();
    }
    return yearStr;
  });
}

// ---------------------------------------------------

export function createEmptyPatientProfile(
  overrides: Partial<PatientProfile> = {},
): PatientProfile {
  return {
    id: "",
    patientCode: "",
    firstName: "",
    lastName: "",
    gender: "ชาย",
    dateOfBirth: "",
    province: "",
    postalCode: "",
    occupation: "",
    caregiverFirstName: "",
    caregiverLastName: "",
    caregiverRelationship: "",
    caregiverTelephone: "",
    familyStatus: "มีครอบครัว",
    householdMembersCount: 0,
    hasChildren: false,
    childrenCount: 0,
    ...overrides,
  };
}

function normalizeProfile(profile: PatientProfile): PatientProfile {
  const hasChildren = profile.childrenCount > 0;

  return {
    ...profile,
    patientCode: normalizePatientCode(profile.patientCode),
    firstName: profile.firstName?.trim() || "",
    lastName: profile.lastName?.trim() || "",
    gender: profile.gender || "ชาย",
    dateOfBirth: profile.dateOfBirth.trim(),
    province: profile.province.trim(),
    postalCode: profile.postalCode.trim(),
    occupation: profile.occupation.trim(),
    caregiverFirstName: profile.caregiverFirstName.trim(),
    caregiverLastName: profile.caregiverLastName.trim(),
    caregiverRelationship: profile.caregiverRelationship.trim(),
    caregiverTelephone: profile.caregiverTelephone.trim(),
    familyStatus: profile.familyStatus || "มีครอบครัว",
    householdMembersCount: Number.isFinite(profile.householdMembersCount)
      ? profile.householdMembersCount
      : 0,
    childrenCount: hasChildren && Number.isFinite(profile.childrenCount)
      ? profile.childrenCount
      : 0,
  };
}

function validateProfile(profile: PatientProfile): PatientFormErrors {
  const normalized = normalizeProfile(profile);
  const errors: PatientFormErrors = {};

  if (!normalized.firstName) {
    errors.firstName = "กรุณากรอกชื่อ";
  }

  if (!normalized.lastName) {
    errors.lastName = "กรุณากรอกนามสกุล";
  }

  if (!normalized.patientCode) {
    errors.patientCode = "กรุณาสร้างหรือกรอกรหัสเข้าใช้งานผู้รับบริการ";
  } else if (!validatePatientCodeFormat(normalized.patientCode)) {
    errors.patientCode = "รหัสต้องอยู่ในรูปแบบ P-XXXXXX เช่น P-482913";
  }

  if (!normalized.province) {
    errors.province = "กรุณากรอกจังหวัดภูมิลำเนา";
  }

  if (normalized.postalCode && !/^\d{5}$/.test(normalized.postalCode)) {
    errors.postalCode = "รหัสไปรษณีย์ควรมี 5 หลัก";
  }

  if (!normalized.caregiverFirstName) {
    errors.caregiverFirstName = "กรุณากรอกชื่อผู้ดูแล";
  }

  if (!normalized.caregiverLastName) {
    errors.caregiverLastName = "กรุณากรอกนามสกุลผู้ดูแล";
  }

  if (!normalized.caregiverRelationship) {
    errors.caregiverRelationship = "กรุณากรอกความเกี่ยวข้อง";
  }

  if (!normalized.caregiverTelephone) {
    errors.caregiverTelephone = "กรุณากรอกเบอร์โทรศัพท์ผู้ดูแล";
  }

  if (normalized.householdMembersCount < 0) {
    errors.householdMembersCount = "จำนวนสมาชิกต้องไม่ติดลบ";
  }

  if (normalized.childrenCount < 0) {
    errors.childrenCount = "จำนวนลูกต้องไม่ติดลบ";
  }

  return errors;
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-[#F8FEFF] p-5 ring-1 ring-[#D7EFF0]">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

// --- Helper Functions for DD/MM/YYYY (Buddhist) <-> YYYY-MM-DD (Gregorian) ---

// Converts state "YYYY-MM-DD" (Gregorian) to input "DD/MM/BBBB" (Buddhist)
function formatForInput(dateString: string): string {
  if (!dateString) return "";
  const parts = dateString.split("-");
  
  // Only convert if it's a full YYYY-MM-DD string
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parseInt(parts[0], 10);
    const buddhistYear = year < 2400 ? year + 543 : year;
    return `${parts[2]}/${parts[1]}/${buddhistYear}`;
  }
  
  return dateString; // Return as-is while the user is partially typing
}

// Converts input "DD/MM/BBBB" (Buddhist) to state "YYYY-MM-DD" (Gregorian)
function parseFromInput(inputString: string): string {
  if (!inputString) return "";
  const parts = inputString.split("/");
  
  // Only convert if the user has completed typing DD/MM/YYYY
  if (parts.length === 3 && parts[2].length === 4) {
    const year = parseInt(parts[2], 10);
    const gregorianYear = year >= 2400 ? year - 543 : year;
    return `${gregorianYear}-${parts[1]}-${parts[0]}`;
  }
  
  return inputString; // Return as-is while the user is partially typing
}

function Field({
  children,
  error,
  label,
}: {
  children: ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="space-y-2">
      <span className="font-semibold">{label}</span>
      {children}
      {error ? (
        <span className="block text-sm font-semibold text-[#B42318]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export default function PatientForm({
  mode,
  initialValues,
  onSubmit,
  cancelHref,
}: PatientFormProps) {
  const patientCodeInputId = useId();
  const [profile, setProfile] = useState<PatientProfile>(() =>
    createEmptyPatientProfile(initialValues),
  );
  const [errors, setErrors] = useState<PatientFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [codeStatus, setCodeStatus] = useState("");

  const title = mode === "create" ? "เพิ่มผู้รับบริการใหม่" : "แก้ไขข้อมูลผู้รับบริการ";
  const submitLabel = mode === "create" ? "บันทึกผู้รับบริการ" : "บันทึกการแก้ไข";
  const savingLabel = mode === "create" ? "กำลังบันทึก..." : "กำลังบันทึก...";
  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  function updateProfile(patch: Partial<PatientProfile>) {
    setProfile((current) => ({
      ...current,
      ...patch,
    }));
  }

  function handleGeneratePatientCode() {
    if (mode === "edit") {
      const confirmed = window.confirm(
        "การสร้างรหัสใหม่จะทำให้รหัสเดิมใช้เข้าไม่ได้หลังบันทึกการแก้ไข ต้องการดำเนินการต่อหรือไม่?",
      );

      if (!confirmed) {
        return;
      }
    }

    const nextCode = generatePatientCode();
    updateProfile({ patientCode: nextCode });
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.patientCode;
      return nextErrors;
    });
    setCodeStatus(
      mode === "create"
        ? "สร้างรหัสเข้าใช้งานแล้ว"
        : "สร้างรหัสใหม่แล้ว กรุณาบันทึกการแก้ไขเพื่อใช้งานรหัสนี้",
    );
  }

  async function handleCopyPatientCode() {
    const normalizedCode = normalizePatientCode(profile.patientCode);

    if (
      !normalizedCode ||
      typeof navigator === "undefined" ||
      !navigator.clipboard
    ) {
      return;
    }

    await navigator.clipboard.writeText(normalizedCode);
    setCodeStatus("คัดลอกรหัสแล้ว");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedProfile = normalizeProfile(profile);
    const nextErrors = validateProfile(normalizedProfile);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const isUnique = await isPatientCodeUnique(
      normalizedProfile.patientCode,
      normalizedProfile.id || undefined,
    );

    if (!isUnique) {
      setErrors((current) => ({
        ...current,
        patientCode: "รหัสเข้าใช้งานผู้รับบริการนี้ถูกใช้แล้ว",
      }));
      return;
    }

    setIsSaving(true);
    const didSave = await onSubmit(normalizedProfile);
    setIsSaving(false);

    if (!didSave) {
      return;
    }
  }

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#F6FEFF_0%,#EAF9FB_58%,#DFF3F5_100%)] px-5 py-6 text-[#123232] sm:px-8">
      <div className="mx-auto w-full max-w-[980px] rounded-[34px] bg-white px-8 py-8 shadow-[0_26px_70px_rgba(24,112,108,0.13)] ring-1 ring-[#CDEEEF]">
        <h1 className="text-3xl font-bold">{title}</h1>

        <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
          <FormSection title="ข้อมูลผู้รับบริการ">
            <Field label="ชื่อ" error={errors.firstName}>
              <input
                className={inputClass}
                required
                value={profile.firstName}
                onChange={(event) => updateProfile({ firstName: event.target.value })}
              />
            </Field>

            <Field label="นามสกุล" error={errors.lastName}>
              <input
                className={inputClass}
                required
                value={profile.lastName}
                onChange={(event) => updateProfile({ lastName: event.target.value })}
              />
            </Field>

            <div className="space-y-2">
              <label className="font-semibold" htmlFor={patientCodeInputId}>
                รหัสเข้าใช้งานผู้รับบริการ
              </label>
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <input
                  id={patientCodeInputId}
                  className={inputClass}
                  placeholder="เช่น P-482913"
                  required
                  value={profile.patientCode}
                  onChange={(event) => {
                    updateProfile({
                      patientCode: normalizePatientCode(event.target.value),
                    });
                    setCodeStatus("");
                  }}
                />
                <button
                  type="button"
                  onClick={handleGeneratePatientCode}
                  className="inline-flex min-h-[50px] items-center justify-center rounded-xl bg-[#EAF9F8] px-4 text-base font-bold text-[#0F756F] ring-1 ring-[#CDEEEF] hover:bg-[#DFF5F4]"
                >
                  {mode === "create" ? "สร้างรหัสเข้าใช้งาน" : "สร้างรหัสใหม่"}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#557276]">
                <span>รูปแบบ Patient Code: P-XXXXXX</span>
                {profile.patientCode ? (
                  <button
                    type="button"
                    onClick={handleCopyPatientCode}
                    className="rounded-full border border-[#CDEEEF] bg-white px-3 py-1 font-bold text-[#13756F] hover:bg-[#F7FFFF]"
                  >
                    คัดลอกรหัส
                  </button>
                ) : null}
              </div>
              <p className="text-sm font-medium text-[#557276]">
                ส่งรหัสนี้ให้ผู้รับบริการหรือผู้ดูแล เพื่อใช้เข้าเริ่มฝึก
              </p>
              {codeStatus ? (
                <p className="text-sm font-bold text-[#12847D]">{codeStatus}</p>
              ) : null}
              {errors.patientCode ? (
                <span className="block text-sm font-semibold text-[#B42318]">
                  {errors.patientCode}
                </span>
              ) : null}
            </div>

            <Field label="เพศ">
              <select
                className={inputClass}
                value={profile.gender}
                onChange={(event) => updateProfile({ gender: event.target.value })}
              >
                {genderOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="วันเกิด">
              <input
                className={inputClass}
                placeholder="เช่น 12/01/2499"
                value={formatForInput(profile.dateOfBirth)}
                onChange={(event) => 
                  updateProfile({ 
                    dateOfBirth: parseFromInput(event.target.value) 
                  })
                }
              />
              <p className="text-sm font-medium text-[#557276]">
                แสดงผล: {formatThaiBirthDate(toBuddhistYear(profile.dateOfBirth))}
              </p>
            </Field>
            
            <Field label="จังหวัดภูมิลำเนา" error={errors.province}>
              <input
                className={inputClass}
                required
                value={profile.province}
                onChange={(event) => updateProfile({ province: event.target.value })}
              />
            </Field>

            <Field label="รหัสไปรษณีย์" error={errors.postalCode}>
              <input
                className={inputClass}
                inputMode="numeric"
                maxLength={5}
                placeholder="เช่น 52000"
                value={profile.postalCode}
                onChange={(event) => updateProfile({ postalCode: event.target.value })}
              />
            </Field>

            <Field label="อาชีพ">
              <input
                className={inputClass}
                placeholder="เช่น เกษตรกร"
                value={profile.occupation}
                onChange={(event) => updateProfile({ occupation: event.target.value })}
              />
            </Field>
          </FormSection>

          <FormSection title="ข้อมูลผู้ดูแล">
            <Field label="ชื่อผู้ดูแล" error={errors.caregiverFirstName}>
              <input
                className={inputClass}
                required
                value={profile.caregiverFirstName}
                onChange={(event) =>
                  updateProfile({ caregiverFirstName: event.target.value })
                }
              />
            </Field>

            <Field label="นามสกุลผู้ดูแล" error={errors.caregiverLastName}>
              <input
                className={inputClass}
                required
                value={profile.caregiverLastName}
                onChange={(event) =>
                  updateProfile({ caregiverLastName: event.target.value })
                }
              />
            </Field>

            <Field
              label="ความเกี่ยวข้องกับผู้รับบริการ"
              error={errors.caregiverRelationship}
            >
              <input
                className={inputClass}
                placeholder="เช่น ภรรยา, สามี, บุตร, ญาติ"
                required
                value={profile.caregiverRelationship}
                onChange={(event) =>
                  updateProfile({ caregiverRelationship: event.target.value })
                }
              />
            </Field>

            <Field label="เบอร์โทรศัพท์ผู้ดูแล" error={errors.caregiverTelephone}>
              <input
                type="tel"
                className={inputClass}
                placeholder="เช่น 0812345678"
                required
                value={profile.caregiverTelephone}
                onChange={(event) =>
                  updateProfile({ caregiverTelephone: event.target.value })
                }
              />
            </Field>
          </FormSection>

          <FormSection title="ข้อมูลครอบครัว">
            <Field label="สถานะครอบครัว">
              <select
                className={inputClass}
                value={profile.familyStatus}
                onChange={(event) =>
                  updateProfile({ familyStatus: event.target.value })
                }
              >
                {familyStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="จำนวนสมาชิกในครอบครัว"
              error={errors.householdMembersCount}
            >
              <input
                type="number"
                min={0}
                className={inputClass}
                value={profile.householdMembersCount || ""}
                onChange={(event) =>
                  updateProfile({
                    householdMembersCount:
                      event.target.value === "" ? 0 : Number(event.target.value),
                  })
                }
              />
            </Field>

            <div className="flex items-center gap-3 rounded-xl border border-[#D7EFF0] bg-white px-4 py-3">
              <input
                id={`hasChildren-${mode}`}
                type="checkbox"
                className="h-5 w-5 accent-[#1FA89C]"
                checked={profile.hasChildren}
                onChange={(event) =>
                  updateProfile({
                    hasChildren: event.target.checked,
                    childrenCount: event.target.checked ? profile.childrenCount : 0,
                  })
                }
              />
              <label htmlFor={`hasChildren-${mode}`} className="font-semibold">
                มีลูกหรือไม่
              </label>
            </div>

            <Field label="จำนวนลูก" error={errors.childrenCount}>
              <input
                type="number"
                min={0}
                className={inputClass}
                disabled={!profile.hasChildren}
                value={profile.hasChildren ? profile.childrenCount || "" : 0}
                onChange={(event) =>
                  updateProfile({
                    childrenCount:
                      event.target.value === "" ? 0 : Number(event.target.value),
                  })
                }
              />
            </Field>
          </FormSection>

          {hasErrors ? (
            <p className="rounded-2xl bg-[#FFF1F3] px-5 py-3 text-base font-semibold text-[#B42318] ring-1 ring-[#F8C9C4]">
              กรุณาตรวจสอบข้อมูลที่จำเป็นก่อนบันทึก
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href={cancelHref}
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#CDEEEF] bg-white px-7 text-lg font-semibold text-[#13756F] shadow-sm hover:bg-[#F7FFFF]"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#1FA89C] px-7 text-lg font-bold text-white shadow-[0_10px_24px_rgba(31,168,156,0.22)] hover:bg-[#178F84] disabled:opacity-60"
            >
              {isSaving ? savingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}