import "@supabase/functions-js/edge-runtime.d.ts"

import {
  assertPayloadSize,
  callOpenRouter,
  getErrorStatus,
  handleOptions,
  jsonResponse,
  readJson,
  requireAuthenticatedUser,
  requireNonEmptyString,
  UpstreamError,
} from "../_shared/openrouter.ts"
import { createLogger } from "../_shared/logger.ts"

const log = createLogger("ai-plan")

type PlanRequest = {
  goalTitle: string
  targetDate?: string
  answers?: Record<string, string>
}

type GeneratedTask = {
  title: string
  notes: string
  effort: "S" | "M" | "L"
  dueDate: string
}

type PlanResponse = {
  plan?: unknown
  tasks?: unknown
}

function extractJsonObject(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim()
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")

  if (start === -1 || end === -1 || start >= end) {
    throw new UpstreamError("AI-план вернул ответ не в формате JSON.")
  }

  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    throw new UpstreamError("AI-план вернул некорректный JSON.")
  }
}

function normalizeEffort(value: unknown): GeneratedTask["effort"] {
  return value === "S" || value === "M" || value === "L" ? value : "M"
}

function normalizeTasks(value: unknown): GeneratedTask[] {
  if (!Array.isArray(value)) {
    throw new UpstreamError("AI-план не вернул массив tasks.")
  }

  const tasks = value
    .slice(0, 7)
    .map((item, index) => {
      const task = item as Partial<Record<keyof GeneratedTask, unknown>>
      const title =
        typeof task.title === "string" && task.title.trim()
          ? task.title.trim().slice(0, 180)
          : `Шаг ${index + 1}`
      const notes =
        typeof task.notes === "string" && task.notes.trim()
          ? task.notes.trim()
          : "Сгенерировано AI-планировщиком."
      const dueDate = typeof task.dueDate === "string" ? task.dueDate.trim() : ""

      return {
        title,
        notes,
        effort: normalizeEffort(task.effort),
        dueDate,
      }
    })
    .filter((task) => task.title.length >= 3)

  if (tasks.length === 0) {
    throw new UpstreamError("AI-план не вернул задач для сохранения.")
  }

  return tasks
}

function parsePlanResponse(content: string) {
  const payload = extractJsonObject(content) as PlanResponse
  const tasks = normalizeTasks(payload.tasks)
  const plan =
    typeof payload.plan === "string" && payload.plan.trim()
      ? payload.plan.trim()
      : tasks.map((task, index) => `${index + 1}. ${task.title}`).join("\n")

  return { plan, tasks }
}

export default {
  async fetch(request: Request) {
    const options = handleOptions(request)
    if (options) return options

    try {
      requireAuthenticatedUser(request)
      const body = await readJson<PlanRequest>(request)
      requireNonEmptyString(body.goalTitle, "goalTitle")
      const serialized = assertPayloadSize(body)
      log.info("Запрос на построение плана", {
        answerCount: Object.keys(body.answers ?? {}).length,
      })
      const { content, model } = await callOpenRouter([
        {
          role: "system",
          content:
            'Ты AI-планировщик FocusTrack AI. Ответь строго валидным JSON без markdown: {"plan":"короткий план на русском","tasks":[{"title":"3-180 символов","notes":"короткое пояснение","effort":"S|M|L","dueDate":"YYYY-MM-DD или пустая строка"}]}. Верни 3-7 задач, пригодных для сохранения как todo.',
        },
        {
          role: "user",
          content: serialized,
        },
      ])
      const parsed = parsePlanResponse(content)

      return jsonResponse(request, {
        type: "plan",
        model,
        plan: parsed.plan,
        tasks: parsed.tasks,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error("Ошибка обработки запроса", { message })
      return jsonResponse(request, { error: message }, getErrorStatus(error))
    }
  },
}
