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
  testid: string,
  sectionId: string,
) {
  const button = page.getByTestId(testid)

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
          "Тестовый weekly review: прогресс подтверждён, следующий шаг — сфокусироваться на одной ближайшей задаче.",
      }),
    })
  })

  await page.goto("/")
  await expect(page).toHaveTitle(/FocusTrack AI/)
  await expect(page.getByTestId("workspace-title")).toBeVisible()
  await expect(page.getByTestId("sidebar-tagline")).toBeVisible()
  await page.screenshot({
    fullPage: true,
    path: screenshotPath("dashboard-desktop-initial.png"),
  })

  await page.getByTestId("new-goal-button").click()
  await page.getByTestId("goal-title-input").fill("Прочитать 12 книг за год")
  await page
    .getByTestId("goal-context-input")
    .fill("Одна книга в месяц, заметки и краткие конспекты после каждой.")
  await page.getByTestId("goal-submit").click()
  await expect(
    page.getByTestId("goal-item").filter({ hasText: "Прочитать 12 книг за год" }),
  ).toBeVisible()

  const task = page
    .getByTestId("task-item")
    .filter({ hasText: "Базовый объём 15 км в неделю" })
    .getByTestId("task-checkbox")
  await task.click()
  await expect(task).toBeChecked()

  await page.getByTestId("ai-review-button").click()
  await expect(page.getByTestId("ai-review-panel")).toContainText(
    /Тестовый weekly review|Демо-режим/,
  )
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
  await expect(page.getByTestId("workspace-title")).toBeVisible()

  await expectSidebarNavigationTarget(page, "nav-goals", "goals")
  await expectSidebarNavigationTarget(page, "nav-tasks", "tasks")
  await expectSidebarNavigationTarget(page, "nav-ai-plan", "ai-plan")
  await expectSidebarNavigationTarget(page, "nav-reviews", "reviews")
  await expectSidebarNavigationTarget(page, "nav-overview", "overview")
})

test("email/password login dialog renders and validates input", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "desktop-only flow")

  await page.goto("/")
  await page.getByTestId("login-trigger").click()

  await expect(page.getByTestId("login-dialog")).toBeVisible()
  await expect(page.getByTestId("login-email-input")).toBeVisible()
  await expect(page.getByTestId("login-password-input")).toBeVisible()

  const submit = page.getByTestId("login-submit")
  await expect(submit).toBeDisabled()

  await page.getByTestId("login-email-input").fill("demo@focustrack.ai")
  await page.getByTestId("login-password-input").fill("focustrack-demo")
  await expect(submit).toBeEnabled()
})

test("mobile dashboard keeps the primary content usable", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-mobile", "mobile-only flow")

  await page.goto("/")
  await expect(page.getByTestId("workspace-title")).toBeVisible()
  await expect(page.getByTestId("new-goal-button")).toBeVisible()
  await expect(page.getByTestId("categories-card")).toBeVisible()
  await page.screenshot({
    fullPage: true,
    path: screenshotPath("dashboard-mobile.png"),
  })
})
