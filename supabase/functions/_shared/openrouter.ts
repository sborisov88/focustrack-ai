import { logEvent } from "./logger.ts"

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

type SupabaseJwtPayload = {
  sub?: string
  role?: string
}

export class AuthError extends Error {
  status = 401
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  )

  return atob(padded)
}

function decodeJwtPayload(token: string): SupabaseJwtPayload {
  const [, payload] = token.split(".")

  if (!payload) {
    throw new AuthError("Некорректный JWT.")
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as SupabaseJwtPayload
  } catch {
    throw new AuthError("Некорректный JWT.")
  }
}

export function requireAuthenticatedUser(request: Request): string {
  const authHeader = request.headers.get("Authorization") ?? ""
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]

  if (!token) {
    throw new AuthError("Missing authorization header")
  }

  const payload = decodeJwtPayload(token)

  if (payload.role !== "authenticated" || !payload.sub) {
    throw new AuthError(
      "AI/RAG функции доступны только пользователю с сессией.",
    )
  }

  return payload.sub
}

export function getErrorStatus(error: unknown) {
  return error instanceof AuthError ? error.status : 500
}

// CORS: явный allowlist вместо wildcard "*". Список источников настраивается
// секретом ALLOWED_ORIGINS (через запятую); по умолчанию — продакшн + локальная
// разработка. Заголовок отражает только разрешённый источник запроса.
const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ??
  "https://focustrack-ai.vercel.app,http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

const DEFAULT_ORIGIN = ALLOWED_ORIGINS[0] ?? "https://focustrack-ai.vercel.app"

export function resolveAllowedOrigin(request: Request): string {
  const origin = request.headers.get("Origin") ?? ""
  return ALLOWED_ORIGINS.includes(origin) ? origin : DEFAULT_ORIGIN
}

export function corsHeaders(request: Request): HeadersInit {
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(request),
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }
}

export function jsonResponse(request: Request, body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders(request),
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
  const model =
    Deno.env.get("OPENROUTER_MODEL") ?? "google/gemini-2.5-flash-lite"

  if (!apiKey) {
    logEvent("error", "openrouter", "OPENROUTER_API_KEY не задан")
    throw new Error("OPENROUTER_API_KEY не задан в Supabase secrets.")
  }

  const startedAt = Date.now()
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
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
    },
  )

  const payload = (await response.json()) as ChatResponse

  if (!response.ok) {
    logEvent("error", "openrouter", "OpenRouter вернул ошибку", {
      status: response.status,
      model,
      latencyMs: Date.now() - startedAt,
    })
    throw new Error(
      payload.error?.message ?? `OpenRouter вернул HTTP ${response.status}.`,
    )
  }

  const content = payload.choices?.[0]?.message?.content?.trim()

  if (!content) {
    logEvent("warn", "openrouter", "Пустой ответ модели", { model })
    throw new Error("OpenRouter вернул пустой ответ.")
  }

  logEvent("info", "openrouter", "Ответ модели получен", {
    model,
    latencyMs: Date.now() - startedAt,
  })

  return { content, model }
}

export function handleOptions(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  }

  return null
}
