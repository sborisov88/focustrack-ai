import type { Provider } from "@supabase/supabase-js"

import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase"

export type SupportedOAuthProvider = Extract<Provider, "google">

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
