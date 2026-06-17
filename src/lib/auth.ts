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
