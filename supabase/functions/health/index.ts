import "@supabase/functions-js/edge-runtime.d.ts"

import { createLogger } from "../_shared/logger.ts"

const log = createLogger("health")

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

export default {
  fetch(request: Request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const openRouterSecretConfigured = Boolean(Deno.env.get("OPENROUTER_API_KEY"))

    if (!openRouterSecretConfigured) {
      log.warn("Health-check: секрет OpenRouter не сконфигурирован")
    } else {
      log.info("Health-check выполнен")
    }

    return Response.json(
      {
        service: "focustrack-ai",
        status: "ok",
        checks: {
          edgeFunction: true,
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
