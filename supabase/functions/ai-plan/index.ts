import "@supabase/functions-js/edge-runtime.d.ts"

import {
  callOpenRouter,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/openrouter.ts"

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
      const body = await readJson<PlanRequest>(request)
      const { content, model } = await callOpenRouter([
        {
          role: "system",
          content:
            "Ты AI-планировщик FocusTrack AI. Составь реалистичный план: этапы, задачи, effort S/M/L, риски и ближайшее действие. Ответь на русском, с короткими заголовками.",
        },
        {
          role: "user",
          content: JSON.stringify(body),
        },
      ])

      return jsonResponse({
        type: "plan",
        model,
        plan: content,
      })
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : String(error) },
        500
      )
    }
  },
}
