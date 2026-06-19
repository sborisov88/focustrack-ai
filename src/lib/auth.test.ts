import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const supabaseMock = vi.hoisted(() => ({
  client: null as null | {
    auth: {
      signUp: () => Promise<{
        data: { session: { user: { id: string } } | null }
        error: Error | null
      }>
    }
  },
  hasConfig: true,
}))

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => supabaseMock.client,
  hasSupabaseConfig: () => supabaseMock.hasConfig,
}))

import {
  getOAuthErrorMessage,
  getPasswordAuthErrorMessage,
  signUpWithPassword,
} from "@/lib/auth"

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

describe("getPasswordAuthErrorMessage", () => {
  it("maps invalid credentials to an actionable sign-in message", () => {
    expect(
      getPasswordAuthErrorMessage(new Error("Invalid login credentials")),
    ).toBe(
      "Аккаунт не найден или пароль неверный. Проверьте пароль или нажмите «Создать аккаунт».",
    )
  })

  it("maps unconfirmed email to a confirmation hint", () => {
    expect(getPasswordAuthErrorMessage(new Error("Email not confirmed"))).toBe(
      "Email ещё не подтверждён. Откройте письмо от Supabase, подтвердите адрес и войдите снова.",
    )
  })

  it("maps existing account signup errors to sign-in guidance", () => {
    const error = new Error(
      JSON.stringify({
        error_code: "user_already_exists",
        msg: "User already registered",
      }),
    )

    expect(getPasswordAuthErrorMessage(error)).toBe(
      "Аккаунт уже существует. Переключитесь на вход по email.",
    )
  })

  it("returns generic password auth message for unknown errors", () => {
    expect(getPasswordAuthErrorMessage(null)).toBe(
      "Не удалось выполнить операцию с email и паролем. Попробуйте ещё раз.",
    )
  })
})

describe("signUpWithPassword", () => {
  beforeEach(() => {
    supabaseMock.hasConfig = true
    vi.stubGlobal("location", { origin: "http://localhost:5173" })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    supabaseMock.client = null
  })

  it("returns requiresEmailConfirmation=false when a session is created", async () => {
    supabaseMock.client = {
      auth: {
        signUp: async () => ({
          data: { session: { user: { id: "u1" } } },
          error: null,
        }),
      },
    }

    await expect(
      signUpWithPassword("new@example.com", "secret123"),
    ).resolves.toEqual({ requiresEmailConfirmation: false })
  })

  it("returns requiresEmailConfirmation=true when no session is returned", async () => {
    supabaseMock.client = {
      auth: {
        signUp: async () => ({ data: { session: null }, error: null }),
      },
    }

    await expect(
      signUpWithPassword("new@example.com", "secret123"),
    ).resolves.toEqual({ requiresEmailConfirmation: true })
  })

  it("throws when Supabase returns an error", async () => {
    supabaseMock.client = {
      auth: {
        signUp: async () => ({
          data: { session: null },
          error: new Error("User already registered"),
        }),
      },
    }

    await expect(
      signUpWithPassword("dupe@example.com", "secret123"),
    ).rejects.toThrow("User already registered")
  })
})
