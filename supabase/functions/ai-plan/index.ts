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
} from "../_shared/openrouter.ts"
import { createLogger } from "../_shared/logger.ts"

const log = createLogger("ai-plan")

type PlanRequest = {
  goalTitle: string
  targetDate?: string
  answers?: Record<string, string>
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
            "Ты AI-планировщик FocusTrack AI. Составь реалистичный план: этапы, задачи, effort S/M/L, риски и ближайшее действие. Ответь на русском, с короткими заголовками.",
        },
        {
          role: "user",
          content: serialized,
        },
      ])

      return jsonResponse(request, {
        type: "plan",
        model,
        plan: content,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error("Ошибка обработки запроса", { message })
      return jsonResponse(request, { error: message }, getErrorStatus(error))
    }
  },
}
