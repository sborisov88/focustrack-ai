import type { SupabaseClient } from "jsr:@supabase/supabase-js@2"

export class RateLimitError extends Error {
  status = 429

  constructor(public retryAfterSeconds: number) {
    super("Слишком много запросов. Повторите позже.")
  }
}

type FunctionName =
  | "ai-clarify"
  | "ai-plan"
  | "ai-weekly-review"
  | "rag-answer"
  | "embed-knowledge-document"

function envKey(functionName: FunctionName) {
  return `RATE_LIMIT_${functionName.toUpperCase().replaceAll("-", "_")}_MAX`
}

function rateLimitMax(functionName: FunctionName) {
  const specific = Number(Deno.env.get(envKey(functionName)) ?? "")
  if (Number.isFinite(specific) && specific > 0) return specific

  const shared = Number(Deno.env.get("RATE_LIMIT_MAX_REQUESTS") ?? "")
  if (Number.isFinite(shared) && shared > 0) return shared

  return 60
}

function rateLimitWindowSeconds() {
  const value = Number(Deno.env.get("RATE_LIMIT_WINDOW_SECONDS") ?? "")
  if (Number.isFinite(value) && value > 0) return value

  return 3600
}

export async function enforceRateLimit(
  supabase: SupabaseClient,
  userId: string,
  functionName: FunctionName,
) {
  const windowSeconds = rateLimitWindowSeconds()
  const maxRequests = rateLimitMax(functionName)
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString()

  const { count, error: countError } = await supabase
    .from("function_invocations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("function_name", functionName)
    .gte("created_at", since)

  if (countError) throw countError

  if ((count ?? 0) >= maxRequests) {
    await supabase.from("function_invocations").insert({
      user_id: userId,
      function_name: functionName,
      status: "blocked",
      metadata: { windowSeconds, maxRequests },
    })

    throw new RateLimitError(windowSeconds)
  }

  const { error: insertError } = await supabase
    .from("function_invocations")
    .insert({
      user_id: userId,
      function_name: functionName,
      status: "accepted",
      metadata: { windowSeconds, maxRequests },
    })

  if (insertError) throw insertError
}
