# Финальный проект: доказательства

## Реализация

FocusTrack AI включает рабочий vector RAG:

- CRUD заметок на `/knowledge`;
- автоматическая индексация заметки после создания или редактирования;
- chunks с overlap;
- OpenRouter embeddings model `baai/bge-m3`;
- Supabase Postgres + pgvector `vector(1024)`;
- HNSW index по `knowledge_chunks.embedding`;
- RLS-safe RPC `match_knowledge_chunks`;
- grounded answer с citations и сохранением в `knowledge_answers`.

## Проверки 25 июня 2026

```text
pnpm lint -> passed
pnpm typecheck -> passed
pnpm test -> 41 passed
pnpm build -> passed
pnpm test:e2e -> 9 passed / 11 skipped
(cd supabase/functions/rag-answer && deno check --no-lock --node-modules-dir=auto index.ts) -> passed
(cd supabase/functions/embed-knowledge-document && deno check --no-lock --node-modules-dir=auto index.ts) -> passed
supabase migration up -> local migration applied
```

Локальный SQL/RLS smoke:

```text
extension vector -> present
knowledge_chunks.embedding -> vector(1024)
match_knowledge_chunks -> present
HNSW index -> present
RLS -> user A sees only own chunk
rag-answer without JWT -> 401
```

## Evidence-файлы

- `submissions/final-project/evidence/local-vector-rag-sql-rls-smoke-2026-06-25.json`
- `submissions/final-project/evidence/openrouter-embedding-preflight-2026-06-25.json`
- `submissions/final-project/evidence/production-vector-rag-smoke-2026-06-26.json`

## Production-развёртывание

Production-развёртывание выполнено 26 июня 2026 по Москве после успешного OpenRouter embeddings preflight:

```text
OpenRouter /embeddings baai/bge-m3 -> 200
embedding.length -> 1024
Supabase migration -> applied
embed-knowledge-document -> deployed
rag-answer -> deployed
authenticated vector RAG smoke -> ok
knowledge_documents created -> true
knowledge_chunks count -> 1
knowledge_answers created -> 1
citationCount -> 1
```
