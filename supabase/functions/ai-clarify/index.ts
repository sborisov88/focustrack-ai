import "@supabase/functions-js/edge-runtime.d.ts"

import {
  callOpenRouter,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/openrouter.ts"

type ClarifyRequest = {
  goalTitle: string
  description?: string
  constraints?: string[]
}

export default {
  async fetch(request: Request) {
    const options = handleOptions(request)
    if (options) return options

    try {
      const body = await readJson<ClarifyRequest>(request)
      const { content, model } = await callOpenRouter([
        {
          role: "system",
          content:
            "Ты продуктовый AI-коуч FocusTrack AI. Задай 5 коротких уточняющих вопросов для превращения учебной цели в SMART-план. Ответь только маркированным списком на русском.",
        },
        {
          role: "user",
          content: JSON.stringify(body),
        },
      ])

      return jsonResponse({
        type: "clarify",
        model,
        questions: content
          .split("\n")
          .map((line) => line.replace(/^[-*0-9. )]+/, "").trim())
          .filter(Boolean)
          .slice(0, 7),
        raw: content,
      })
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : String(error) },
        500
      )
    }
  },
}
