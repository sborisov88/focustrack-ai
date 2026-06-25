# HW6: доказательства

## Статус vector RAG

Реализован полнофункциональный локальный vector RAG:

- `knowledge_documents` хранит исходные заметки и статус индексации;
- `knowledge_chunks` хранит chunks и `embedding vector(1024)`;
- `embed-knowledge-document` строит chunks и embeddings через OpenRouter;
- `rag-answer` выполняет semantic retrieval через `match_knowledge_chunks`, формирует grounded answer и сохраняет citations;
- `/knowledge` поддерживает добавление, редактирование и переиндексацию заметок.

## Проверки 25 июня 2026

```text
pnpm lint -> passed
pnpm typecheck -> passed
pnpm test -> 39 passed
pnpm build -> passed
pnpm test:e2e -> 9 passed / 11 skipped
deno check rag-answer -> passed
deno check embed-knowledge-document -> passed
supabase migration up -> applied 20260625204340_add_vector_rag.sql locally
```

SQL/RLS:

```text
knowledge_chunks.embedding -> vector(1024)
match_knowledge_chunks -> exists
HNSW index -> exists
RLS smoke -> user A sees only own chunk
rag-answer without JWT -> 401
```

## Evidence-файлы

- `submissions/final-project/evidence/local-vector-rag-sql-rls-smoke-2026-06-25.json`
- `submissions/final-project/evidence/openrouter-embedding-preflight-2026-06-25.json`
- `submissions/final-project/evidence/production-vector-rag-smoke-2026-06-26.json`

## Production rollout

Production rollout выполнен 26 июня 2026 по Москве:

```text
OpenRouter /embeddings baai/bge-m3 -> 200
embedding.length -> 1024
Supabase migration -> applied
embed-knowledge-document -> deployed
rag-answer -> deployed
authenticated vector RAG smoke -> ok
chunkCount -> 1
ragMatchCount -> 1
citationCount -> 1
```
