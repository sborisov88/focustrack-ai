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
    code?: string | number
    message?: string
  }
}

type EmbeddingResponse = {
  data?: Array<{
    embedding?: number[]
  }>
  model?: string
  error?: {
    code?: string | number
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

// Ошибка валидации входных данных запроса (некорректное/слишком большое тело).
export class ValidationError extends Error {
  status = 400
}

export class UpstreamError extends Error {
  status = 502
}

// Лимит на суммарный размер тела запроса, уходящего в LLM. Защищает от
// раздувания стоимости токенов и DoS большими payload'ами. Настраивается
// секретом MAX_PAYLOAD_CHARS.
const MAX_PAYLOAD_CHARS = Number(Deno.env.get("MAX_PAYLOAD_CHARS") ?? "50000")

// Сериализует тело и проверяет лимит размера. Возвращает строку, чтобы
// обработчики не сериализовали тело повторно для user-сообщения.
export function assertPayloadSize(body: unknown): string {
  const serialized = JSON.stringify(body ?? {})

  if (serialized.length > MAX_PAYLOAD_CHARS) {
    throw new ValidationError(
      `Слишком большой запрос: ${serialized.length} символов при лимите ${MAX_PAYLOAD_CHARS}.`,
    )
  }

  return serialized
}

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Поле "${field}" обязательно и должно быть непустой строкой.`,
    )
  }

  return value
}

export function requireArray(
  value: unknown,
  field: string,
  maxItems = 200,
): unknown[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`Поле "${field}" должно быть массивом.`)
  }

  if (value.length > maxItems) {
    throw new ValidationError(
      `Поле "${field}" не должно содержать больше ${maxItems} элементов.`,
    )
  }

  return value
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
  if (error instanceof AuthError) return error.status
  if (error instanceof ValidationError) return error.status
  if (error instanceof UpstreamError) return error.status
  return 500
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
    // Битое тело запроса — это ошибка клиента (400), а не сервера (500).
    throw new ValidationError("Некорректный JSON в запросе.")
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
  // Таймаут на внешний вызов: без него Edge Function висит до жёсткого лимита
  // платформы, если апстрим завис. Настраивается секретом OPENROUTER_TIMEOUT_MS.
  const timeoutMs = Number(Deno.env.get("OPENROUTER_TIMEOUT_MS") ?? "30000")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
      signal: controller.signal,
    })
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError"
    logEvent("error", "openrouter", aborted ? "Таймаут OpenRouter" : "Сетевая ошибка OpenRouter", {
      model,
      latencyMs: Date.now() - startedAt,
    })
    throw new Error(
      aborted
        ? `Превышено время ожидания ответа OpenRouter (${timeoutMs} мс).`
        : "Не удалось связаться с OpenRouter.",
    )
  } finally {
    clearTimeout(timeout)
  }

  // Безопасный разбор: читаем тело как текст и парсим в try/catch. Иначе
  // не-JSON ответ апстрима (HTML 502/503, текст rate-limit) бросил бы
  // SyntaxError ДО проверки response.ok и маскировал бы реальную причину.
  const rawBody = await response.text()
  let payload: ChatResponse = {}
  try {
    payload = rawBody ? (JSON.parse(rawBody) as ChatResponse) : {}
  } catch {
    payload = {}
  }

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

function describeOpenRouterStatus(status: number) {
  if (status === 401) return "OpenRouter отклонил ключ API."
  if (status === 402) return "На балансе OpenRouter недостаточно средств."
  if (status === 429) return "OpenRouter ограничил частоту запросов."
  if (status === 529) return "Модель OpenRouter временно перегружена."
  return `OpenRouter вернул HTTP ${status}.`
}

export async function callOpenRouterEmbedding(input: string | string[]) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY")
  const model = Deno.env.get("OPENROUTER_EMBEDDING_MODEL") ?? "baai/bge-m3"
  const expectedDimensions = Number(
    Deno.env.get("OPENROUTER_EMBEDDING_DIMENSIONS") ?? "1024",
  )

  if (!apiKey) {
    logEvent("error", "openrouter", "OPENROUTER_API_KEY не задан")
    throw new Error("OPENROUTER_API_KEY не задан в Supabase secrets.")
  }

  const startedAt = Date.now()
  const timeoutMs = Number(Deno.env.get("OPENROUTER_TIMEOUT_MS") ?? "30000")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/sborisov88/focustrack-ai",
        "X-OpenRouter-Title": "FocusTrack AI",
      },
      body: JSON.stringify({ model, input }),
      signal: controller.signal,
    })
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError"
    logEvent("error", "openrouter", aborted ? "Таймаут OpenRouter embeddings" : "Сетевая ошибка OpenRouter embeddings", {
      model,
      latencyMs: Date.now() - startedAt,
    })
    throw new Error(
      aborted
        ? `Превышено время ожидания OpenRouter embeddings (${timeoutMs} мс).`
        : "Не удалось связаться с OpenRouter embeddings.",
    )
  } finally {
    clearTimeout(timeout)
  }

  const rawBody = await response.text()
  let payload: EmbeddingResponse = {}
  try {
    payload = rawBody ? (JSON.parse(rawBody) as EmbeddingResponse) : {}
  } catch {
    payload = {}
  }

  if (!response.ok) {
    logEvent("error", "openrouter", "OpenRouter embeddings вернул ошибку", {
      status: response.status,
      model,
      latencyMs: Date.now() - startedAt,
    })
    throw new Error(
      payload.error?.message ?? describeOpenRouterStatus(response.status),
    )
  }

  const embeddings = (payload.data ?? []).map((item) => item.embedding)

  if (embeddings.length === 0 || embeddings.some((item) => !Array.isArray(item))) {
    logEvent("warn", "openrouter", "Пустой embedding-ответ", { model })
    throw new Error("OpenRouter не вернул embedding-вектор.")
  }

  const invalidEmbedding = embeddings.find(
    (item) => item && item.length !== expectedDimensions,
  )

  if (invalidEmbedding) {
    logEvent("error", "openrouter", "Неверная размерность embedding", {
      model,
      expectedDimensions,
      actualDimensions: invalidEmbedding.length,
    })
    throw new Error(
      `Модель embeddings вернула ${invalidEmbedding.length} измерений вместо ${expectedDimensions}.`,
    )
  }

  logEvent("info", "openrouter", "Embeddings получены", {
    model,
    count: embeddings.length,
    dimensions: expectedDimensions,
    latencyMs: Date.now() - startedAt,
  })

  return {
    embeddings: embeddings as number[][],
    model: payload.model ?? model,
    dimensions: expectedDimensions,
  }
}

export function handleOptions(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  }

  return null
}
