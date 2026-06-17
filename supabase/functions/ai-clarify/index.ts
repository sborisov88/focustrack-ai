import "@supabase/functions-js/edge-runtime.d.ts"

import {
  callOpenRouter,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/openrouter.ts"
import { createLogger } from "../_shared/logger.ts"

const log = createLogger("ai-clarify")

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
      log.info("Запрос на уточнение цели", { hasDescription: Boolean(body.description) })
      const { content, model } = await callOpenRouter([
        {
          role: "system",
          content:
            "Ты продуктовый AI-коуч FocusTrack AI. Задай 5 коротких уточняющих вопросов для превращения цели в SMART-план. Ответь только маркированным списком на русском.",
        },
        {
          role: "user",
          content: JSON.stringify(body),
        },
      ])

      return jsonResponse(request, {
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
      const message = error instanceof Error ? error.message : String(error)
      log.error("Ошибка обработки запроса", { message })
      return jsonResponse(request, { error: message }, 500)
    }
  },
}
