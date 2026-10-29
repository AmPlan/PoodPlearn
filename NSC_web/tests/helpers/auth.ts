import type { Page } from "@playwright/test";

const authSessionStorageKey = "nsc-web-auth-session";

export async function seedPatientSession(page: Page) {
  await page.addInitScript((storageKey) => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        user: {
          id: "e2e-patient-user",
          accessCode: "P-000001",
          role: "patient",
          displayName: "ผู้ทดสอบ",
          patientId: 1,
          therapistId: null,
        },
        accessCode: "P-000001",
        role: "patient",
      }),
    );
  }, authSessionStorageKey);
}
