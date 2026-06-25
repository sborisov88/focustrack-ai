import { createClient } from "jsr:@supabase/supabase-js@2"

export function createUserSupabaseClient(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
  const authorization = request.headers.get("Authorization") ?? ""

  if (!supabaseUrl || !anonKey) {
    throw new Error("SUPABASE_URL или SUPABASE_ANON_KEY не заданы.")
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  })
}
