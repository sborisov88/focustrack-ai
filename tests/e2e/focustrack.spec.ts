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
  routePath: string,
  routeTestId: string,
) {
  const button = page.getByTestId(testid)

  await button.click()
  await expect(button).toHaveAttribute("data-active", "true")
  await expect(page).toHaveURL(new RegExp(`${routePath}$`))
  await expect(page.getByTestId(routeTestId)).toBeVisible()
}

async function openDemoWorkspace(page: Page) {
  await expect(page.getByTestId("mode-badge")).toContainText("Вход не выполнен")
  await expect(page.getByTestId("signed-out-empty-state")).toBeVisible()
  await expect(page.getByTestId("goal-item")).toHaveCount(0)
  await page.getByTestId("show-demo-button").click()
  await expect(page.getByTestId("mode-badge")).toContainText("Демо-режим")
  await expect(page.getByTestId("demo-banner")).toBeVisible()
}

async function openHeaderNewGoalDialog(page: Page) {
  await page.locator("header").getByTestId("new-goal-button").click()
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
  await openDemoWorkspace(page)
  await expect(page.getByTestId("route-dashboard")).toBeVisible()
  await page.screenshot({
    fullPage: true,
    path: screenshotPath("dashboard-desktop-initial.png"),
  })

  await openHeaderNewGoalDialog(page)
  await page.getByTestId("goal-title-input").fill("Прочитать 12 книг за год")
  await page
    .getByTestId("goal-context-input")
    .fill("Одна книга в месяц, заметки и краткие конспекты после каждой.")
  await page.getByTestId("goal-submit").click()
  await expect(
    page
      .getByTestId("goal-item")
      .filter({ hasText: "Прочитать 12 книг за год" }),
  ).toBeVisible()
  await page.getByTestId("nav-planner").click()
  await expect(page.getByTestId("route-planner")).toBeVisible()
  await page
    .getByTestId("goal-item")
    .filter({ hasText: "Пробежать первый полумарафон" })
    .click()

  const task = page
    .getByTestId("task-item")
    .filter({ hasText: "Базовый объём 15 км в неделю" })
    .getByTestId("task-checkbox")
  await task.click()
  await expect(task).toBeChecked()

  await page.getByTestId("ai-review-button").click()
  await page.getByTestId("nav-review").click()
  await expect(page.getByTestId("ai-review-panel")).toContainText(
    /Тестовый weekly review|Демо-режим/,
  )
  await page.screenshot({
    fullPage: true,
    path: screenshotPath("dashboard-desktop-after-flow.png"),
  })
})

test("desktop goal creation supports AI clarify and AI plan flow", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "desktop-only flow")

  await page.goto("/planner")
  await expect(page.getByTestId("workspace-title")).toBeVisible()
  await openDemoWorkspace(page)
  await expect(page.getByTestId("route-planner")).toBeVisible()

  await openHeaderNewGoalDialog(page)
  await page.getByTestId("goal-title-input").fill("Подготовить демо продукта")
  await page
    .getByTestId("goal-context-input")
    .fill("Нужно показать AI-уточнение, AI-план и RAG без лишних шагов.")
  await page.getByTestId("goal-clarify-button").click()

  const answers = page.getByTestId("clarify-answer-input")
  await expect(answers.first()).toBeVisible()
  const answerCount = await answers.count()
  for (let index = 0; index < answerCount; index += 1) {
    await answers.nth(index).fill(`Ответ ${index + 1} для плана запуска`)
  }

  await page.getByTestId("goal-plan-button").click()
  await expect(page.getByTestId("ai-plan-result")).toContainText("AI-план")
  await expect(
    page
      .getByTestId("goal-item")
      .filter({ hasText: "Подготовить демо продукта" }),
  ).toBeVisible()
  await expect(page.getByText("AI-план").first()).toBeVisible()
})

test("desktop RAG panel answers a question from knowledge documents", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "desktop-only flow")

  await page.goto("/knowledge")
  await expect(page.getByTestId("workspace-title")).toBeVisible()
  await openDemoWorkspace(page)
  await expect(page.getByTestId("route-knowledge")).toBeVisible()

  await page
    .getByTestId("rag-question-input")
    .fill("на какой неделе была самая длинная пробежка")
  await page.getByTestId("rag-submit").click()
  await expect(page.getByTestId("rag-answer")).toContainText(/15 км|недел/i)
})

test("desktop navigation opens four primary routes", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "desktop-only flow")

  await page.goto("/")
  await expect(page.getByTestId("workspace-title")).toBeVisible()
  await openDemoWorkspace(page)

  await expect(page.getByTestId("route-dashboard")).toBeVisible()
  await expectSidebarNavigationTarget(
    page,
    "nav-planner",
    "/planner",
    "route-planner",
  )
  await expectSidebarNavigationTarget(
    page,
    "nav-knowledge",
    "/knowledge",
    "route-knowledge",
  )
  await expectSidebarNavigationTarget(
    page,
    "nav-review",
    "/review",
    "route-review",
  )
  await expectSidebarNavigationTarget(
    page,
    "nav-dashboard",
    "/dashboard",
    "route-dashboard",
  )
})

test("email/password auth dialog renders sign in and sign up modes", async ({
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

  await page.getByTestId("auth-mode-signup").click()
  await expect(page.getByTestId("login-dialog")).toContainText("Регистрация")
  await expect(page.getByTestId("login-submit")).toContainText(
    "Зарегистрироваться",
  )
  await expect(page.getByTestId("auth-mode-signin")).toBeVisible()
})

test("desktop demo goal can be deleted", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "desktop-only flow")

  await page.goto("/planner")
  await openDemoWorkspace(page)

  await openHeaderNewGoalDialog(page)
  await page.getByTestId("goal-title-input").fill("Удаляемая цель")
  await page
    .getByTestId("goal-context-input")
    .fill("Проверка явной операции DELETE в интерфейсе.")
  await page.getByTestId("goal-submit").click()
  await expect(
    page.getByTestId("goal-item").filter({ hasText: "Удаляемая цель" }),
  ).toBeVisible()

  await page
    .getByTestId("goal-item")
    .filter({ hasText: "Удаляемая цель" })
    .getByTestId("delete-goal-button")
    .click()
  await expect(
    page.getByTestId("goal-item").filter({ hasText: "Удаляемая цель" }),
  ).toHaveCount(0)
})

test("mobile dashboard keeps the primary content usable", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-mobile", "mobile-only flow")

  await page.goto("/")
  await expect(page.getByTestId("workspace-title")).toBeVisible()
  await openDemoWorkspace(page)
  await expect(page.getByTestId("new-goal-button")).toBeVisible()
  await expect(page.getByTestId("categories-card")).toBeVisible()
  await page.screenshot({
    fullPage: true,
    path: screenshotPath("dashboard-mobile.png"),
  })
})

test("live Supabase flow persists created goals and task status", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "desktop-only flow")
  test.skip(
    !process.env.E2E_DEMO_EMAIL || !process.env.E2E_DEMO_PASSWORD,
    "requires E2E_DEMO_EMAIL and E2E_DEMO_PASSWORD",
  )

  const title = `E2E persistence ${Date.now()}`

  await page.goto("/")
  await page.getByTestId("login-trigger").click()
  await page.getByTestId("login-email-input").fill(process.env.E2E_DEMO_EMAIL!)
  await page
    .getByTestId("login-password-input")
    .fill(process.env.E2E_DEMO_PASSWORD!)
  await page.getByTestId("login-submit").click()
  await expect(page.getByTestId("mode-badge")).toContainText("Supabase")
  // After login the demo banner disappears.
  await expect(page.getByTestId("demo-banner")).toHaveCount(0)

  await openHeaderNewGoalDialog(page)
  await page.getByTestId("goal-title-input").fill(title)
  await page
    .getByTestId("goal-context-input")
    .fill("Проверка сохранения цели через Supabase Data API.")
  await page.getByTestId("goal-submit").click()
  await expect(
    page.getByTestId("goal-item").filter({ hasText: title }),
  ).toBeVisible()

  await page.reload()
  await expect(
    page.getByTestId("goal-item").filter({ hasText: title }),
  ).toBeVisible()

  await page.getByTestId("nav-planner").click()
  await expect(page.getByTestId("route-planner")).toBeVisible()
  const firstTask = page.getByTestId("task-item").first()
  const checkbox = firstTask.getByTestId("task-checkbox")
  const initiallyChecked = await checkbox.isChecked()
  const taskUpdate = page.waitForResponse(
    (response) =>
      response.url().includes("/rest/v1/tasks") &&
      response.request().method() === "PATCH" &&
      response.ok(),
  )
  await checkbox.click()
  await taskUpdate
  await expect(checkbox).toBeChecked({ checked: !initiallyChecked })
  await page.reload()
  await expect(page.getByTestId("mode-badge")).toContainText("Supabase")
  await expect(
    page.getByTestId("task-item").first().getByTestId("task-checkbox"),
  ).toBeChecked({ checked: !initiallyChecked })

  await page.getByTestId("signout-button").click()
  await expect(page.getByTestId("mode-badge")).toContainText("Вход не выполнен")
  await expect(page.getByTestId("user-email")).toHaveCount(0)
  await expect(page.getByTestId("signed-out-empty-state")).toBeVisible()
  await expect(
    page.getByTestId("goal-item").filter({ hasText: title }),
  ).toHaveCount(0)
  await expect(page.getByTestId("goal-item")).toHaveCount(0)
})
