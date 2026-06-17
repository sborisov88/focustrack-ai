import "@supabase/functions-js/edge-runtime.d.ts"

import {
  callOpenRouter,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/openrouter.ts"

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
      const body = await readJson<RagRequest>(request)
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

      return jsonResponse({
        type: "rag-answer",
        model,
        answer: content,
      })
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : String(error) },
        500
      )
    }
  },
}
