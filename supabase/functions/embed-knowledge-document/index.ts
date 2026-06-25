import "@supabase/functions-js/edge-runtime.d.ts"

import {
  callOpenRouterEmbedding,
  getErrorStatus,
  handleOptions,
  jsonResponse,
  readJson,
  requireAuthenticatedUser,
  requireNonEmptyString,
  ValidationError,
} from "../_shared/openrouter.ts"
import { createLogger } from "../_shared/logger.ts"
import { createUserSupabaseClient } from "../_shared/supabase-user.ts"
import {
  sha256Hex,
  splitKnowledgeContentIntoChunks,
} from "../_shared/knowledge.ts"

const log = createLogger("embed-knowledge-document")

type EmbedKnowledgeDocumentRequest = {
  documentId: string
}

type KnowledgeDocumentRow = {
  id: string
  user_id: string
  title: string
  source: string
  content: string
  content_hash: string | null
}

export default {
  async fetch(request: Request) {
    const options = handleOptions(request)
    if (options) return options

    let documentId = ""
    let supabase: ReturnType<typeof createUserSupabaseClient> | null = null

    try {
      const userId = requireAuthenticatedUser(request)
      supabase = createUserSupabaseClient(request)
      const body = await readJson<EmbedKnowledgeDocumentRequest>(request)
      documentId = requireNonEmptyString(body.documentId, "documentId")

      const { data: document, error: documentError } = await supabase
        .from("knowledge_documents")
        .select("id,user_id,title,source,content,content_hash")
        .eq("id", documentId)
        .single()

      if (documentError || !document) {
        throw new ValidationError("Документ не найден.")
      }

      const row = document as KnowledgeDocumentRow
      if (row.user_id !== userId) {
        throw new ValidationError("Документ не найден.")
      }

      const chunks = splitKnowledgeContentIntoChunks(row.content)
      if (chunks.length === 0) {
        throw new ValidationError("Документ пустой, индексировать нечего.")
      }

      const contentHash = await sha256Hex(row.content)
      const { error: indexingError } = await supabase
        .from("knowledge_documents")
        .update({
          embedding_status: "indexing",
          embedding_error: null,
          embedded_at: null,
          content_hash: contentHash,
        })
        .eq("id", row.id)

      if (indexingError) {
        throw indexingError
      }

      const embeddingResult = await callOpenRouterEmbedding(
        chunks.map((chunk) => chunk.content),
      )
      const chunkRows = await Promise.all(
        chunks.map(async (chunk, index) => ({
          user_id: userId,
          document_id: row.id,
          chunk_index: chunk.chunkIndex,
          content: chunk.content,
          content_hash: await sha256Hex(chunk.content),
          embedding: embeddingResult.embeddings[index],
          metadata: {
            title: row.title,
            source: row.source,
            documentContentHash: contentHash,
            chunkCount: chunks.length,
            embeddingModel: embeddingResult.model,
          },
        })),
      )

      const { error: deleteError } = await supabase
        .from("knowledge_chunks")
        .delete()
        .eq("document_id", row.id)

      if (deleteError) {
        throw deleteError
      }

      const { error: insertError } = await supabase
        .from("knowledge_chunks")
        .insert(chunkRows)

      if (insertError) {
        throw insertError
      }

      const { error: readyError } = await supabase
        .from("knowledge_documents")
        .update({
          embedding_status: "ready",
          embedding_error: null,
          embedded_at: new Date().toISOString(),
          content_hash: contentHash,
        })
        .eq("id", row.id)

      if (readyError) {
        throw readyError
      }

      log.info("Документ проиндексирован", {
        documentId: row.id,
        chunkCount: chunks.length,
        dimensions: embeddingResult.dimensions,
      })

      return jsonResponse(request, {
        type: "embed-knowledge-document",
        documentId: row.id,
        status: "ready",
        chunkCount: chunks.length,
        model: embeddingResult.model,
        dimensions: embeddingResult.dimensions,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      if (supabase && documentId) {
        await supabase
          .from("knowledge_documents")
          .update({
            embedding_status: "failed",
            embedding_error: message.slice(0, 500),
          })
          .eq("id", documentId)
      }

      log.error("Ошибка индексации документа", { documentId, message })
      return jsonResponse(request, { error: message }, getErrorStatus(error))
    }
  },
}
