# Knowledge/RAG experiment

## Цель

Проверить слой ответов по личным заметкам пользователя: журнал тренировок, бюджет, план подготовки, рабочие заметки по целям.

## Архитектура

Текущая реализация переведена с controlled RAG на vector RAG:

1. пользователь создаёт или редактирует заметку на `/knowledge`;
2. frontend сохраняет запись в `public.knowledge_documents`;
3. Edge Function `embed-knowledge-document` читает документ через пользовательский JWT и RLS;
4. текст режется на стабильные chunks с overlap;
5. для chunks строятся embeddings через OpenRouter `baai/bge-m3`;
6. embeddings сохраняются в `public.knowledge_chunks.embedding vector(1024)`;
7. `rag-answer` строит embedding вопроса, вызывает RPC `match_knowledge_chunks`, передаёт модели только найденные фрагменты и сохраняет ответ в `public.knowledge_answers`.

`service_role` в пользовательском RAG-потоке не используется.

## Схема

Основные таблицы:

- `knowledge_documents` — исходные заметки, статус индексации и hash контента;
- `knowledge_chunks` — chunks, metadata и embedding `vector(1024)`;
- `knowledge_answers` — сохранённые ответы с citations.

Индексы и retrieval:

- `knowledge_chunks_embedding_hnsw_idx` через HNSW + `vector_cosine_ops`;
- `match_knowledge_chunks(query_embedding, match_threshold, match_count, filter_document_id)` фильтрует строки по `auth.uid()`; `filter_document_id = null` ищет по всем источникам пользователя.

## Контракт UI

- `+ Добавить заметку` создаёт ручной источник и запускает индексацию.
- `Редактировать` обновляет заметку, сбрасывает статус и переиндексирует chunks.
- `Переиндексировать` повторно запускает `embed-knowledge-document`.
- По умолчанию вопрос ищет по всем источникам со статусом `Готово`; пользователь может вручную ограничить область поиска одним источником.
- Ответ показывает текст модели и citations по найденным chunks со score сходства.

## Проверки 25 июня 2026

Локально выполнено:

```text
pnpm lint -> passed
pnpm typecheck -> passed
pnpm test -> 55 passed
pnpm build -> passed
pnpm test:e2e -> 9 passed / 11 skipped
(cd supabase/functions/rag-answer && deno check --no-lock --node-modules-dir=auto index.ts) -> passed
(cd supabase/functions/embed-knowledge-document && deno check --no-lock --node-modules-dir=auto index.ts) -> passed
supabase migration up -> applied 20260625204340_add_vector_rag.sql
```

SQL/RLS smoke:

```text
extension vector -> 1
knowledge_chunks.embedding -> vector(1024)
match_knowledge_chunks -> 1
HNSW index -> 1
RLS: user A sees only "RLS smoke A"; user B chunk is hidden
rag-answer without JWT -> 401
```

Evidence хранится вне публичного продуктового репозитория в teacher-facing пакете верхнего workspace. В публичной документации остаётся только redacted summary без секретов и персональных данных.

## Production rollout

Production rollout выполнен 26 июня 2026 по Москве:

- OpenRouter `/embeddings` preflight для `baai/bge-m3` вернул HTTP 200 и `embedding.length === 1024`;
- Supabase secrets заданы: `OPENROUTER_API_KEY`, `OPENROUTER_EMBEDDING_MODEL`, `RAG_MATCH_THRESHOLD`, `RAG_MATCH_COUNT`;
- cloud migration `20260625204340_add_vector_rag.sql` применена к проекту `wbxyyvvuqrhqtuywfeto`;
- Edge Functions `embed-knowledge-document` и `rag-answer` задеплоены;
- authenticated production smoke создал `knowledge_documents`, `knowledge_chunks`, `knowledge_answers`, получил grounded answer с citation и затем очистил smoke-данные.

```text
production smoke -> ok
embedDimensions -> 1024
ragMatchCount -> 1
citationCount -> 1
answerContainsExpectedFact -> true
```
