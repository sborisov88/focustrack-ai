import type { Provider } from "@supabase/supabase-js"

import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase"

export type SupportedOAuthProvider = Extract<Provider, "google">

type SupabaseAuthErrorPayload = {
  code?: number
  error_code?: string
  msg?: string
}

function parseSupabaseAuthErrorPayload(
  value: string,
): SupabaseAuthErrorPayload | null {
  try {
    const parsed = JSON.parse(value) as SupabaseAuthErrorPayload

    if (parsed.msg || parsed.error_code) {
      return parsed
    }
  } catch {
    return null
  }

  return null
}

function getAuthErrorPayload(error: unknown): SupabaseAuthErrorPayload | null {
  if (typeof error !== "object" || error === null) {
    return null
  }

  if ("message" in error && typeof error.message === "string") {
    const fromMessage = parseSupabaseAuthErrorPayload(error.message)

    if (fromMessage) {
      return fromMessage
    }
  }

  if ("msg" in error && typeof error.msg === "string") {
    return {
      code: "code" in error && typeof error.code === "number" ? error.code : undefined,
      error_code:
        "error_code" in error && typeof error.error_code === "string"
          ? error.error_code
          : undefined,
      msg: error.msg,
    }
  }

  return null
}

export function getOAuthErrorMessage(error: unknown): string {
  const payload = getAuthErrorPayload(error)

  if (
    payload?.error_code === "validation_failed" &&
    payload.msg?.toLowerCase().includes("provider is not enabled")
  ) {
    return "Google OAuth не включён в Supabase Dashboard. Войдите по email или настройте провайдера — см. DEMO_ACCESS.md."
  }

  if (payload?.msg) {
    return payload.msg
  }

  if (error instanceof Error && error.message.trim()) {
    const fromMessage = parseSupabaseAuthErrorPayload(error.message)

    if (fromMessage?.msg) {
      return getOAuthErrorMessage(fromMessage)
    }

    return error.message
  }

  return "Не удалось запустить OAuth-вход. Попробуйте позже или войдите по email."
}

export async function signInWithOAuth(provider: SupportedOAuthProvider) {
  const supabase = getSupabaseClient()

  if (!supabase || !hasSupabaseConfig()) {
    throw new Error("Supabase OAuth не настроен для текущего окружения.")
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: globalThis.location.origin,
    },
  })

  if (error) {
    throw error
  }
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient()

  if (!supabase || !hasSupabaseConfig()) {
    throw new Error("Supabase не настроен для текущего окружения.")
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    throw error
  }
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient()

  if (!supabase || !hasSupabaseConfig()) {
    throw new Error("Supabase не настроен для текущего окружения.")
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: globalThis.location.origin,
    },
  })

  if (error) {
    throw error
  }
}

export async function signOut() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
