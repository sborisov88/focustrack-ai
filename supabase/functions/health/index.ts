import "@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
}

export default {
  fetch(request: Request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    return Response.json(
      {
        service: "focustrack-ai",
        status: "ok",
        checks: {
          edgeFunction: true,
          openRouterSecretConfigured: Boolean(
            Deno.env.get("OPENROUTER_API_KEY"),
          ),
          model:
            Deno.env.get("OPENROUTER_MODEL") ?? "google/gemini-2.5-flash-lite",
        },
        checkedAt: new Date().toISOString(),
      },
      { headers: corsHeaders },
    )
  },
}
