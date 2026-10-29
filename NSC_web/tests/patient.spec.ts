import { expect, test } from "@playwright/test";
import { seedPatientSession } from "./helpers/auth";

test("completes a one-question assessment using a skipped answer", async ({ page }) => {
  await seedPatientSession(page);

  await page.route("**/api/v1/assessments", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { assessment: { assessmentResultId: 42, setId: 2 } },
      }),
    });
  });
  await page.route("**/api/v1/training-sets/2", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        setId: 2,
        title: "แบบทดสอบตัวอย่าง",
        setQuestions: [
          {
            questionId: 11,
            orderIndex: 1,
            question: {
              questionId: 11,
              questionType: "COMPREHENSION",
              ComprehensionQuestion: [
                {
                  questionText: "วันนี้อากาศดีไหม",
                  questionVoiceUrl: "",
                  correctAnswer: true,
                },
              ],
            },
          },
        ],
      }),
    });
  });
  await page.route("**/api/v1/assessments/42/items", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { isCorrect: false } }),
    });
  });
  await page.route("**/api/v1/assessments/42/complete", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { categoryResults: [] } }),
    });
  });

  await page.goto("/patient/assessment/session");
  await expect(page.getByText("วันนี้อากาศดีไหม")).toBeVisible();

  const savedAnswer = page.waitForRequest(
    (request) =>
      request.url().includes("/api/v1/assessments/42/items") && request.method() === "POST",
  );
  await page.getByRole("button", { name: "ข้ามข้อนี้" }).click();
  await savedAnswer;

  await expect(page).toHaveURL(/\/patient\/assessment\/result$/);
});

test("completes a one-question naming training session", async ({ page }) => {
  await seedPatientSession(page);

  await page.route("**/api/v1/sessions/12", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          sessionResult: {
            sessionId: 12,
            patientId: 1,
            sessionCategoryResult: {
              sessionCategoryId: 22,
              sessionId: 12,
              setId: 7,
              startedAt: "2026-01-01T00:00:00.000Z",
            },
          },
        },
      }),
    });
  });
  await page.route("**/api/v1/training-sets/7", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        setId: 7,
        title: "สัตว์ฝึก",
        setQuestions: [
          {
            questionId: 71,
            orderIndex: 1,
            question: {
              questionId: 71,
              questionType: "NAMING",
              namingQuestions: [{ correctAnswer: "แมว" }],
            },
          },
        ],
      }),
    });
  });
  await page.route("**/api/v1/sessions/12/items", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        message: "คำตอบถูกบันทึกแล้ว",
        isCorrect: false,
        score: 0,
        correctness: 0,
      }),
    });
  });
  await page.route("**/api/v1/sessions/12/complete", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          sessionId: 12,
          patientId: 1,
          categories: [
            {
              sessionCategoryId: 22,
              sessionId: 12,
              setId: 7,
              totalScore: 0,
              averageResponseTime: 0,
              averageHintUsed: 0,
              startedAt: "2026-01-01T00:00:00.000Z",
              endedAt: "2026-01-01T00:01:00.000Z",
            },
          ],
        },
      }),
    });
  });

  await page.goto("/patient/training/naming/session/12");
  await expect(page.getByText("ข้อที่ 1 จากทั้งหมด 1 ข้อ")).toBeVisible();
  await expect(page.getByText("ภาพนี้คืออะไร")).toBeVisible();

  await page.getByRole("button", { name: "ข้ามข้อนี้" }).click();

  await expect(page.getByRole("heading", { name: "ฝึกครบ 1 ข้อแล้ว" })).toBeVisible();
  await expect(page.getByText("ข้อที่ข้าม")).toBeVisible();
});
