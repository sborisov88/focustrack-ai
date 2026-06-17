import { mkdirSync } from "node:fs"
import { join } from "node:path"

import { expect, test, type Page } from "@playwright/test"

const screenshotsDir = join(process.cwd(), "output/playwright/screenshots")

function screenshotPath(name: string) {
  mkdirSync(screenshotsDir, { recursive: true })
  return join(screenshotsDir, name)
}

async function expectSidebarNavigationTarget(
  page: Page,
  name: string,
  sectionId: string,
) {
  const button = page.getByRole("button", { exact: true, name })

  await button.click()
  await expect(button).toHaveAttribute("data-active", "true")
  await expect
    .poll(async () => {
      const box = await page.locator(`#${sectionId}`).boundingBox()
      const viewport = page.viewportSize()

      return Boolean(box && viewport && box.y >= 0 && box.y < viewport.height)
    })
    .toBe(true)
}

test("desktop dashboard flow renders and updates local state", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "desktop-only flow")

  await page.route("**/functions/v1/ai-weekly-review", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        type: "weekly-review",
        model: "google/gemini-2.5-flash-lite",
        review:
          "Тестовый weekly review: прогресс подтверждён, следующий шаг — зафиксировать артефакты сдачи.",
      }),
    })
  })

  await page.goto("/")
  await expect(page).toHaveTitle(/FocusTrack AI/)
  await expect(
    page.getByRole("heading", {
      name: "Рабочее пространство FocusTrack AI",
    }),
  ).toBeVisible()
  await expect(page.getByText("ДЗ 3-6 + проект")).toBeVisible()
  await page.screenshot({
    fullPage: true,
    path: screenshotPath("dashboard-desktop-initial.png"),
  })

  await page.getByRole("button", { name: "Новая цель" }).click()
  await page.getByLabel("Название").fill("Проверить сдачу OTUS")
  await page
    .getByLabel("Контекст")
    .fill("Собрать документы, скриншоты, видео и отчеты проверки.")
  await page.getByRole("button", { name: "Добавить" }).click()
  await expect(
    page.getByRole("button", { name: /Проверить сдачу OTUS/ }),
  ).toBeVisible()

  const task = page.getByRole("checkbox", {
    name: "Отметить задачу Контрольный прогон перед отправкой",
  })
  await task.click()
  await expect(task).toBeChecked()

  await page.getByRole("button", { name: "AI Review" }).click()
  const reviewPanel = page.getByRole("complementary")
  await expect(
    reviewPanel.getByText(/Тестовый weekly review|Демо-режим/),
  ).toBeVisible()
  await page.screenshot({
    fullPage: true,
    path: screenshotPath("dashboard-desktop-after-flow.png"),
  })
})

test("desktop sidebar navigation buttons scroll to their dashboard sections", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "desktop-only flow")

  await page.goto("/")
  await expect(
    page.getByRole("heading", {
      name: "Рабочее пространство FocusTrack AI",
    }),
  ).toBeVisible()

  await expectSidebarNavigationTarget(page, "Цели", "goals")
  await expectSidebarNavigationTarget(page, "Задачи", "tasks")
  await expectSidebarNavigationTarget(page, "AI-план", "ai-plan")
  await expectSidebarNavigationTarget(page, "Обзоры", "reviews")
  await expectSidebarNavigationTarget(page, "Обзор", "overview")
})

test("mobile dashboard keeps the primary content usable", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-mobile", "mobile-only flow")

  await page.goto("/")
  await expect(
    page.getByRole("heading", {
      name: "Рабочее пространство FocusTrack AI",
    }),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Новая цель" })).toBeVisible()
  await expect(page.getByText("Готовность сдачи")).toBeVisible()
  await page.screenshot({
    fullPage: true,
    path: screenshotPath("dashboard-mobile.png"),
  })
})
