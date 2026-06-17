type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type ChatChoice = {
  message?: {
    content?: string
  }
}

type ChatResponse = {
  choices?: ChatChoice[]
  error?: {
    message?: string
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  })
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new Error("Некорректный JSON в запросе.")
  }
}

export async function callOpenRouter(messages: ChatMessage[]) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY")
  const model = Deno.env.get("OPENROUTER_MODEL") ?? "google/gemini-2.5-flash-lite"

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY не задан в Supabase secrets.")
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/sborisov88/focustrack-ai",
      "X-OpenRouter-Title": "FocusTrack AI",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  })

  const payload = (await response.json()) as ChatResponse

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `OpenRouter вернул HTTP ${response.status}.`
    )
  }

  const content = payload.choices?.[0]?.message?.content?.trim()

  if (!content) {
    throw new Error("OpenRouter вернул пустой ответ.")
  }

  return { content, model }
}

export function handleOptions(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  return null
}
