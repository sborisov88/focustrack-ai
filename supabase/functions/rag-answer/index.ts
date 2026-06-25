import "@supabase/functions-js/edge-runtime.d.ts"

import {
  assertPayloadSize,
  callOpenRouterEmbedding,
  callOpenRouter,
  getErrorStatus,
  handleOptions,
  jsonResponse,
  readJson,
  requireAuthenticatedUser,
  requireNonEmptyString,
} from "../_shared/openrouter.ts"
import { createLogger } from "../_shared/logger.ts"
import { createUserSupabaseClient } from "../_shared/supabase-user.ts"

const log = createLogger("rag-answer")

type RagRequest = {
  question: string
  selectedDocumentId?: string | null
}

type MatchedChunk = {
  chunk_id: string
  document_id: string
  title: string
  source: string
  content: string
  similarity: number
  chunk_index: number
  metadata: Record<string, unknown> | null
}

export default {
  async fetch(request: Request) {
    const options = handleOptions(request)
    if (options) return options

    try {
      const userId = requireAuthenticatedUser(request)
      const body = await readJson<RagRequest>(request)
      const question = requireNonEmptyString(body.question, "question").trim()
      const selectedDocumentId =
        typeof body.selectedDocumentId === "string" &&
        body.selectedDocumentId.trim()
          ? body.selectedDocumentId.trim()
          : null
      const scope = selectedDocumentId == null ? "all" : "document"
      const supabase = createUserSupabaseClient(request)
      const matchThreshold = Number(Deno.env.get("RAG_MATCH_THRESHOLD") ?? "0.55")
      const matchCount = Number(Deno.env.get("RAG_MATCH_COUNT") ?? "6")

      log.info("Vector RAG-запрос", {
        selectedDocumentId,
        matchThreshold,
        matchCount,
      })

      const embeddingResult = await callOpenRouterEmbedding(question)
      const { data: matchedChunks, error: matchError } = await supabase.rpc(
        "match_knowledge_chunks",
        {
          query_embedding: embeddingResult.embeddings[0],
          match_threshold: matchThreshold,
          match_count: matchCount,
          filter_document_id: selectedDocumentId,
        },
      )

      if (matchError) {
        throw matchError
      }

      const chunks = ((matchedChunks ?? []) as MatchedChunk[]).map((chunk) => ({
        ...chunk,
        similarity: Number(chunk.similarity),
      }))
      const citations = chunks.map((chunk) => ({
        chunkId: chunk.chunk_id,
        documentId: chunk.document_id,
        title: chunk.title,
        source: chunk.source,
        chunkIndex: chunk.chunk_index,
        similarity: Number(chunk.similarity.toFixed(4)),
        content: chunk.content.slice(0, 500),
      }))

      if (chunks.length === 0) {
        const answer =
          "В заметках недостаточно данных, чтобы ответить на этот вопрос без выдумки."
        const { error: answerError } = await supabase
          .from("knowledge_answers")
          .insert({
            user_id: userId,
            document_id: scope === "document" ? selectedDocumentId : null,
            question,
            answer,
            citations,
            model: embeddingResult.model,
          })

        if (answerError) {
          throw answerError
        }

        return jsonResponse(request, {
          type: "rag-answer",
          model: embeddingResult.model,
          answer,
          citations,
          retrieval: {
            matchCount: 0,
            threshold: matchThreshold,
            embeddingModel: embeddingResult.model,
            scope,
          },
        })
      }

      const contextPayload = {
        question,
        chunks: chunks.map((chunk, index) => ({
          ref: index + 1,
          title: chunk.title,
          source: chunk.source,
          similarity: Number(chunk.similarity.toFixed(4)),
          content: chunk.content,
        })),
      }
      const serialized = assertPayloadSize(contextPayload)
      const { content, model } = await callOpenRouter([
        {
          role: "system",
          content:
            "Ты RAG-помощник FocusTrack AI. Отвечай только по найденным фрагментам заметок. Если найдено несколько фрагментов с числами, датами или дистанциями, сравнивай только эти найденные значения и явно называй источник каждого вывода. Если фрагментов недостаточно, скажи: \"В заметках недостаточно данных\". Не придумывай факты. В конце добавь короткий список источников с номерами фрагментов.",
        },
        {
          role: "user",
          content: serialized,
        },
      ])
      const { error: answerError } = await supabase
        .from("knowledge_answers")
        .insert({
          user_id: userId,
          document_id:
            scope === "document"
              ? chunks[0]?.document_id ?? selectedDocumentId
              : null,
          question,
          answer: content,
          citations,
          model,
        })

      if (answerError) {
        throw answerError
      }

      return jsonResponse(request, {
        type: "rag-answer",
        model,
        answer: content,
        citations,
        retrieval: {
          matchCount: chunks.length,
          threshold: matchThreshold,
          embeddingModel: embeddingResult.model,
          scope,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error("Ошибка обработки запроса", { message })
      return jsonResponse(request, { error: message }, getErrorStatus(error))
    }
  },
}
