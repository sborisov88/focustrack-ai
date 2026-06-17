import "@supabase/functions-js/edge-runtime.d.ts"

import {
  callOpenRouter,
  getErrorStatus,
  handleOptions,
  jsonResponse,
  readJson,
  requireAuthenticatedUser,
} from "../_shared/openrouter.ts"
import { createLogger } from "../_shared/logger.ts"

const log = createLogger("rag-answer")

type RagRequest = {
  question: string
  documents: Array<{
    title: string
    content: string
  }>
}

export default {
  async fetch(request: Request) {
    const options = handleOptions(request)
    if (options) return options

    try {
      requireAuthenticatedUser(request)
      const body = await readJson<RagRequest>(request)
      log.info("RAG-запрос по документам", {
        documentCount: body.documents?.length ?? 0,
      })
      const { content, model } = await callOpenRouter([
        {
          role: "system",
          content:
            "Ты RAG-помощник FocusTrack AI. Отвечай только по переданным документам. Если данных не хватает, скажи это явно. В конце добавь список источников по названиям документов.",
        },
        {
          role: "user",
          content: JSON.stringify(body),
        },
      ])

      return jsonResponse(request, {
        type: "rag-answer",
        model,
        answer: content,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error("Ошибка обработки запроса", { message })
      return jsonResponse(request, { error: message }, getErrorStatus(error))
    }
  },
}
