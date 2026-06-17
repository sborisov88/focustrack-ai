import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Public client-side config. These are safe to ship in the bundle (the
// publishable/anon key is browser-facing and data is protected by RLS).
// Fallbacks are used because the CI `vercel build` step does not reliably pass
// Vercel/`.env.production` values into the Vite bundle; an env var, when set,
// still takes precedence.
const FALLBACK_SUPABASE_URL = "https://wbxyyvvuqrhqtuywfeto.supabase.co"
const FALLBACK_SUPABASE_KEY = "sb_publishable_cx-TCDpCHAp1PrH2owzGkw_AY7KQHtK"

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  FALLBACK_SUPABASE_URL
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  FALLBACK_SUPABASE_KEY

let client: SupabaseClient | null = null

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  // Reuse a single client so the auth session and its listeners stay stable.
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey)
  }

  return client
}

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseKey)
}
