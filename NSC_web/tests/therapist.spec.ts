import { expect, test } from "@playwright/test";

test.describe("therapist patient management", () => {
  test("redirects the legacy reports route to the patient list", async ({ page }) => {
    const response = await page.request.get("/therapist/reports", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe("/therapist/patients");
  });

  test("shows required-field validation before saving a patient", async ({ page }) => {
    await page.goto("/therapist/patients/new");
    await page.getByRole("button", { name: "สร้างรหัสเข้าใช้งาน" }).click();
    await expect(page.getByText("สร้างรหัสเข้าใช้งานแล้ว")).toBeVisible();
    await page.getByLabel("ชื่อ", { exact: true }).fill("สมชาย");
    await page.getByLabel("นามสกุล", { exact: true }).fill("ทดสอบ");
    await page.getByLabel("รหัสเข้าใช้งานผู้รับบริการ").fill("bad-code");
    await expect(page.getByRole("button", { name: "คัดลอกรหัส" })).toBeVisible();
    await page.getByLabel("จังหวัดภูมิลำเนา").fill("เชียงใหม่");
    await page.getByLabel("ชื่อผู้ดูแล").fill("ผู้ดูแล");
    await page.getByLabel("นามสกุลผู้ดูแล").fill("ทดสอบ");
    await page.getByLabel("ความเกี่ยวข้องกับผู้รับบริการ").fill("บุตร");
    await page.getByLabel("เบอร์โทรศัพท์ผู้ดูแล").fill("0812345678");
    await page.getByRole("button", { name: "บันทึกผู้รับบริการ" }).click();

    await expect(
      page.getByText("รหัสต้องอยู่ในรูปแบบ P-XXXXXX เช่น P-482913", { exact: true }),
    ).toBeVisible();
  });

  test("submits a valid new patient record", async ({ page }) => {
    await page.route("**/api/v1/patients**", async (route) => {
      if (route.request().method() !== "POST") {
        if (new URL(route.request().url()).searchParams.has("search")) {
          await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              message: "Patients retrieved",
              data: [],
              pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
            }),
          });
        } else {
          await route.continue();
        }
        return;
      }

      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          message: "Patient created",
          user: {
            userId: 5,
            account: "P-123456",
            role: "PATIENT",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          patient: {
            patientId: 5,
            userId: 5,
            patientFirstName: "สมชาย",
            patientLastName: "ทดสอบ",
            gender: "MALE",
            dateOfBirth: "1950-01-01",
            occupation: "",
            province: "เชียงใหม่",
            note: "มีครอบครัว",
            caregiverFirstName: "ผู้ดูแล",
            caregiverLastName: "ทดสอบ",
            caregiverRelationship: "บุตร",
            caregiverTelephone: "0812345678",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            user: {
              account: "P-123456",
              role: "PATIENT",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
            householdMembersCount: 1,
            childrenCount: 0,
            postcode: "",
            familyStatus: "มีครอบครัว",
            recentSessions: [],
            lastAssessment: null,
          },
        }),
      });
    });

    await page.goto("/therapist/patients/new");
    await page.getByRole("button", { name: "สร้างรหัสเข้าใช้งาน" }).click();
    await expect(page.getByText("สร้างรหัสเข้าใช้งานแล้ว")).toBeVisible();
    await page.getByLabel("ชื่อ", { exact: true }).fill("สมชาย");
    await page.getByLabel("นามสกุล", { exact: true }).fill("ทดสอบ");
    await page.getByLabel("รหัสเข้าใช้งานผู้รับบริการ").fill("P-123456");
    await expect(page.getByRole("button", { name: "คัดลอกรหัส" })).toBeVisible();
    await page.getByLabel("จังหวัดภูมิลำเนา").fill("เชียงใหม่");
    await page.getByLabel("ชื่อผู้ดูแล").fill("ผู้ดูแล");
    await page.getByLabel("นามสกุลผู้ดูแล").fill("ทดสอบ");
    await page.getByLabel("ความเกี่ยวข้องกับผู้รับบริการ").fill("บุตร");
    await page.getByLabel("เบอร์โทรศัพท์ผู้ดูแล").fill("0812345678");

    const createRequestPromise = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname.endsWith("/api/v1/patients/") &&
        request.method() === "POST",
    );
    await page.getByRole("button", { name: "บันทึกผู้รับบริการ" }).click();
    const createRequest = await createRequestPromise;

    expect(createRequest.postDataJSON()).toMatchObject({
      account: "P-123456",
      patientFirstName: "สมชาย",
      patientLastName: "ทดสอบ",
      caregiverFirstName: "ผู้ดูแล",
      caregiverTelephone: "0812345678",
    });
  });
});
