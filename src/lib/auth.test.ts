import { describe, expect, it } from "vitest"

import { getOAuthErrorMessage } from "@/lib/auth"

describe("getOAuthErrorMessage", () => {
  it("maps disabled Google provider to a friendly message", () => {
    const error = new Error(
      JSON.stringify({
        code: 400,
        error_code: "validation_failed",
        msg: "Unsupported provider: provider is not enabled",
      }),
    )

    expect(getOAuthErrorMessage(error)).toContain("Google OAuth не включён")
  })

  it("returns msg from Supabase JSON payload", () => {
    const error = new Error(
      JSON.stringify({
        code: 400,
        error_code: "validation_failed",
        msg: "Invalid redirect URL",
      }),
    )

    expect(getOAuthErrorMessage(error)).toBe("Invalid redirect URL")
  })

  it("falls back to plain Error message", () => {
    expect(getOAuthErrorMessage(new Error("Network timeout"))).toBe(
      "Network timeout",
    )
  })

  it("returns generic message for unknown errors", () => {
    expect(getOAuthErrorMessage(null)).toBe(
      "Не удалось запустить OAuth-вход. Попробуйте позже или войдите по email.",
    )
  })
})
