import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined

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
