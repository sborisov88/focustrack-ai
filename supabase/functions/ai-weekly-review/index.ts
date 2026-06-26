import "@supabase/functions-js/edge-runtime.d.ts"

import {
  assertPayloadSize,
  callOpenRouter,
  errorResponseBody,
  getErrorStatus,
  handleOptions,
  jsonResponse,
  readJson,
  requireArray,
  requireAuthenticatedUser,
  requireNonEmptyString,
} from "../_shared/openrouter.ts"
import { createLogger } from "../_shared/logger.ts"
import { enforceRateLimit } from "../_shared/rate-limit.ts"
import { createUserSupabaseClient } from "../_shared/supabase-user.ts"

const log = createLogger("ai-weekly-review")

type WeeklyReviewRequest = {
  weekStart: string
  completedTasks: string[]
  blockedTasks: string[]
  goalProgress: number
}

export default {
  async fetch(request: Request) {
    const options = handleOptions(request)
    if (options) return options

    try {
      const userId = requireAuthenticatedUser(request)
      const supabase = createUserSupabaseClient(request)
      await enforceRateLimit(supabase, userId, "ai-weekly-review")
      const body = await readJson<WeeklyReviewRequest>(request)
      requireNonEmptyString(body.weekStart, "weekStart")
      requireArray(body.completedTasks, "completedTasks")
      requireArray(body.blockedTasks, "blockedTasks")
      const serialized = assertPayloadSize(body)
      log.info("Запрос на недельный обзор", {
        completed: body.completedTasks?.length ?? 0,
        blocked: body.blockedTasks?.length ?? 0,
      })
      const { content, model } = await callOpenRouter([
        {
          role: "system",
          content:
            "Ты AI-ревьюер FocusTrack AI. Дай weekly review по фактам: что продвинулось, где риск, что сделать следующим. Ответь на русском в 4 коротких блоках.",
        },
        {
          role: "user",
          content: serialized,
        },
      ])

      return jsonResponse(request, {
        type: "weekly-review",
        model,
        review: content,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error("Ошибка обработки запроса", { message })
      return jsonResponse(
        request,
        errorResponseBody(error),
        getErrorStatus(error),
      )
    }
  },
}
