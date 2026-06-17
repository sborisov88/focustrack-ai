import "@supabase/functions-js/edge-runtime.d.ts"

import {
  callOpenRouter,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/openrouter.ts"

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
      const body = await readJson<WeeklyReviewRequest>(request)
      const { content, model } = await callOpenRouter([
        {
          role: "system",
          content:
            "Ты AI-ревьюер FocusTrack AI. Дай weekly review по фактам: что продвинулось, где риск, что сделать следующим. Ответь на русском в 4 коротких блоках.",
        },
        {
          role: "user",
          content: JSON.stringify(body),
        },
      ])

      return jsonResponse({
        type: "weekly-review",
        model,
        review: content,
      })
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : String(error) },
        500
      )
    }
  },
}
