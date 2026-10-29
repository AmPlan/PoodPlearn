import { expect, test } from "@playwright/test";

test.describe("sign-in and patient access", () => {
  test("shows a validation message when sign-in fields are empty", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();

    await expect(page.getByText("กรุณากรอกรหัสผู้ใช้งานและรหัสผ่าน", { exact: true })).toBeVisible();
  });

  test("shows the API error for invalid credentials", async ({ page }) => {
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" }),
      });
    });

    await page.goto("/");
    await page
      .getByLabel("รหัสผู้ใช้งานผู้รับบริการ / Therapist Code")
      .pressSequentially("P-000001", { delay: 20 });
    await expect(page.getByRole("heading", { name: "เข้าเริ่มฝึก" })).toBeVisible();
    await page.getByLabel("รหัสผ่าน").fill("wrong-password");
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();

    await expect(page.getByText("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง", { exact: true })).toBeVisible();
  });

  test("signs in a patient, loads home, and clears the local session on logout", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          userId: "e2e-patient-user",
          account: "P-000001",
          role: "PATIENT",
          patientId: 1,
        }),
      });
    });
    await page.route("**/api/v1/patients/home?*", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          patient: { code: "P-000001", name: "ผู้ทดสอบ" },
          nextAction: {
            type: "needs_standard_assessment",
            targetPath: "/patient/assessment/session",
          },
          weekStreak: [],
        }),
      });
    });

    await page.goto("/");
    await page
      .getByLabel("รหัสผู้ใช้งานผู้รับบริการ / Therapist Code")
      .pressSequentially("P-000001", { delay: 20 });
    await expect(page.getByRole("heading", { name: "เข้าเริ่มฝึก" })).toBeVisible();
    await page.getByLabel("รหัสผ่าน").fill("test-password");
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();

    await expect(page).toHaveURL(/\/patient\/home$/);
    await expect(page.getByRole("heading", { name: "สวัสดีค่ะ คุณผู้ทดสอบ" })).toBeVisible();
    await page.getByRole("button", { name: "ออกจากระบบ" }).click();

    await expect(page).toHaveURL("/");
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("nsc-web-auth-session")))
      .toBeNull();
  });

  test("redirects an unauthenticated visitor away from patient home", async ({ page }) => {
    await page.goto("/patient/home");

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "พูดเพลิน" })).toBeVisible();
  });
});
