import "@supabase/functions-js/edge-runtime.d.ts"

import { createLogger } from "../_shared/logger.ts"

const log = createLogger("health")
const DATABASE_CHECK_TIMEOUT_MS = Number(
  Deno.env.get("DATABASE_CHECK_TIMEOUT_MS") ?? "3000",
)

type DatabaseCheck = {
  reachable: boolean
  latencyMs: number
  status?: number
  error?: "not_configured" | "timeout" | "request_failed"
}

// CORS: явный allowlist вместо wildcard "*" (см. _shared/openrouter.ts).
const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ??
  "https://focustrack-ai.vercel.app,http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

const DEFAULT_ORIGIN = ALLOWED_ORIGINS[0] ?? "https://focustrack-ai.vercel.app"

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") ?? ""
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin)
      ? origin
      : DEFAULT_ORIGIN,
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  }
}

async function checkDatabase(): Promise<DatabaseCheck> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY")

  if (!supabaseUrl || !supabaseKey) {
    return {
      reachable: false,
      latencyMs: 0,
      error: "not_configured",
    }
  }

  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    DATABASE_CHECK_TIMEOUT_MS,
  )

  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/goals?select=id&limit=1`,
      {
        headers: {
          Accept: "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        signal: controller.signal,
      },
    )

    return {
      reachable: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
    }
  } catch (error) {
    return {
      reachable: false,
      latencyMs: Date.now() - startedAt,
      error:
        error instanceof DOMException && error.name === "AbortError"
          ? "timeout"
          : "request_failed",
    }
  } finally {
    clearTimeout(timeout)
  }
}

export default {
  async fetch(request: Request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const openRouterSecretConfigured = Boolean(
      Deno.env.get("OPENROUTER_API_KEY"),
    )
    const database = await checkDatabase()

    if (!openRouterSecretConfigured) {
      log.warn("Health-check: секрет OpenRouter не сконфигурирован")
    } else if (!database.reachable) {
      log.warn("Health-check: база данных недоступна", {
        status: database.status,
        error: database.error,
        latencyMs: database.latencyMs,
      })
    } else {
      log.info("Health-check выполнен", {
        databaseLatencyMs: database.latencyMs,
      })
    }

    return Response.json(
      {
        service: "focustrack-ai",
        status: "ok",
        checks: {
          edgeFunction: true,
          database,
          openRouterSecretConfigured,
          model:
            Deno.env.get("OPENROUTER_MODEL") ?? "google/gemini-2.5-flash-lite",
        },
        checkedAt: new Date().toISOString(),
      },
      { headers: corsHeaders(request) },
    )
  },
}
