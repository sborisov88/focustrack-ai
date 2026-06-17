import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173"
const useExternalBaseURL = Boolean(process.env.PLAYWRIGHT_BASE_URL)

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "output/playwright/test-results",
  fullyParallel: false,
  reporter: [
    ["list"],
    ["html", { outputFolder: "output/playwright/html-report", open: "never" }],
  ],
  use: {
    baseURL,
    locale: "ru-RU",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "on",
  },
  webServer: useExternalBaseURL
    ? undefined
    : {
        command:
          "pnpm run build && pnpm run preview --host 127.0.0.1 --port 4173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        url: baseURL,
      },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
})
