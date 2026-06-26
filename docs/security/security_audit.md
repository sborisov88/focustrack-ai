# Security audit

## Использование AI в аудите безопасности

AI применялся как инженерный инструмент на этапе аудита — для систематического обхода поверхности атаки, ускорения ревью и формализации результатов. AI не заменял ручную проверку: каждый вывод сверялся с реальным кодом, миграциями и настройками функций.

Как AI использовался на практике:

- **Анализ кода по OWASP-категориям.** Frontend, Edge Functions и интеграция с OpenRouter прогонялись по категориям OWASP (Injection, Broken Access Control, Sensitive Data Exposure, Security Logging) с просьбой найти конкретные строки, нарушающие категорию, а не общие рекомендации.
- **Ревью RLS / JWT / секретов.** AI помогал сверить, что RLS включён на всех пользовательских таблицах, что AI/RAG-функции закрыты `verify_jwt=true`, а ключи OpenRouter и Supabase service role нигде не утекают во frontend и в текст ошибок.
- **Генерация и сопровождение чек-листа.** На основе найденных рисков AI помогал собрать production checklist и держать таблицу рисков в актуальном состоянии после правок.

Каждый кандидат-риск, предложенный AI, проверялся вручную: открывался исходный файл, миграция или конфиг функции, и только подтверждённые находки попадали в таблицу рисков.

Примеры промптов аудита:

```text
Проверь Edge Functions в supabase/functions по OWASP Broken Access Control.
Для каждой функции укажи значение verify_jwt и заголовки CORS.
Найди функции, которые отдают Access-Control-Allow-Origin: * или доступны без JWT,
и приведи file:line. Не давай общих советов — только конкретные строки.
```

```text
Просканируй frontend (src/) и Edge Functions на утечку секретов:
OPENROUTER_API_KEY, Supabase service role key. Проверь, что во frontend
используется только publishable key, а текст ошибок не содержит значений
заголовков и ключей. Верни список найденных мест с путями.
```

## Проверенная поверхность

- frontend code;
- Supabase schema;
- RLS policies;
- Edge Functions;
- OpenRouter integration;
- env handling;
- CI workflow.

## Найденные риски и решения

| Риск                                           | Статус           | Решение                                                                                |
| ---------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| OpenRouter key во frontend                     | исправлено       | ключ используется только в Supabase Edge Functions                                     |
| Service role key в браузере                    | не найдено       | frontend использует только publishable key                                             |
| RLS выключен                                   | исправлено       | RLS включен на пользовательских таблицах                                               |
| Новые таблицы не видны Data API                | исправлено       | добавлены явные grants для `authenticated`                                             |
| Лишние grants для `anon`                       | исправлено       | добавлена миграция `20260617033231_restrict_anon_table_grants.sql`                     |
| Ошибки могут раскрыть секреты                  | частично закрыто | функции возвращают сообщение без headers и key values                                  |
| Публичные AI Edge Functions                    | исправлено       | `verify_jwt=true` для AI/RAG функций; публичным оставлен только health                 |
| Секреты в Git                                  | не найдено       | `.env.local` в `.gitignore`, `.env.example` без секретов                               |
| CORS с wildcard `*`                            | исправлено       | заменён на allowlist `ALLOWED_ORIGINS` с `Vary: Origin` в Edge Functions               |
| Нет структурированных логов                    | исправлено       | добавлен `_shared/logger.ts` (JSON, уровни info\|warn\|error)                          |
| Vector RAG chunks могут раскрыть чужие заметки | исправлено       | `knowledge_chunks` защищён RLS, RPC `match_knowledge_chunks` фильтрует по `auth.uid()` |
| Embeddings key во frontend                     | не найдено       | OpenRouter `/embeddings` вызывается только из Edge Functions                           |

## OWASP notes

### Injection

Frontend не строит SQL вручную. CRUD идёт через Supabase client, AI payload сериализуется как JSON.

### Broken Access Control

Основной механизм контроля доступа — RLS policies по `auth.uid()`.

Для vector RAG добавлена отдельная проверка: `knowledge_chunks` имеет RLS policy по `user_id` и связанному `knowledge_documents.user_id`; RPC `match_knowledge_chunks` дополнительно фильтрует `knowledge_chunks.user_id = auth.uid()` и `knowledge_documents.user_id = auth.uid()`. Локальный smoke 25 июня 2026 показал: пользователь A видит только `RLS smoke A`, chunk пользователя B не возвращается ни прямым SELECT, ни RPC.

### Sensitive Data Exposure

Секреты OpenRouter и Supabase service role не используются во frontend.

`OPENROUTER_API_KEY` используется для chat completions и embeddings только в Edge Functions. Пользовательский CRUD/RAG-поток работает через user-scoped Supabase client и RLS; `service_role` не используется для `knowledge_documents`, `knowledge_chunks` или `knowledge_answers`.

### Security Logging

Edge Functions используют структурированное JSON-логирование (`supabase/functions/_shared/logger.ts`): функции `logEvent(level, fn, message, fields)` и `createLogger(fn)`, уровни `info | warn | error`, каждая запись — отдельная строка JSON вида `{level, ts, fn, message, ...поля}`. Логирование подключено в `ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer`, `health`, а вызов модели (`_shared/openrouter.ts`) пишет латентность (`latencyMs`) и ошибки модели. Секреты и значения ключей в логи не попадают. Единый JSON-формат с уровнями упрощает фильтрацию и анализ инцидентов — в том числе AI-инструментами — в логах Supabase. Production-версия должна добавить централизованные алерты поверх этих логов.

### Cross-Origin (CORS)

Wildcard `Access-Control-Allow-Origin: *` заменён на явный allowlist. Список источников берётся из секрета `ALLOWED_ORIGINS` (значения через запятую; по умолчанию — продакшн-домен Vercel и `http://localhost:5173`). Хелпер `corsHeaders(request)` отражает в `Access-Control-Allow-Origin` только источник из allowlist и добавляет `Vary: Origin`, чтобы кэш не смешивал ответы для разных источников. Логика реализована в `_shared/openrouter.ts` и продублирована в `health/index.ts`; сигнатура ответа теперь `jsonResponse(request, body, status = 200)`.

## npm audit

Перед каждым релизом нужно запускать:

```bash
pnpm audit
```

Если audit обнаруживает high/critical, зависимость обновляется или фиксируется исключение с обоснованием.

Фактическая проверка 17 июня 2026:

```text
pnpm audit --audit-level high
No known vulnerabilities found
```

## Production checklist

- оставить `verify_jwt=true` для AI/RAG-функций;
- держать rate limits включёнными для защищённых AI/RAG-функций (выполнено: `function_invocations` + `_shared/rate-limit.ts`);
- настроить OAuth provider secrets в Supabase;
- держать `ALLOWED_ORIGINS` в актуальном состоянии (выполнено: CORS переведён на allowlist с `Vary: Origin`);
- проверять доступность БД в health endpoint без раскрытия service key (выполнено: `checks.database.reachable`);
- настроить централизованные алерты поверх JSON-логов (выполнено: структурированное логирование в `_shared/logger.ts`);
- включить Supabase alerts и хранить redacted evidence вне публичного repo;
- держать dependency audit в CI (`pnpm audit --audit-level high`);
- держать Vercel security headers в `vercel.json`.
- production vector RAG rollout выполнен после authenticated OpenRouter `/embeddings` smoke с `embedding.length === 1024`.

## Supabase smoke 17 июня 2026

```text
GET /functions/v1/health -> 200
checks.database.reachable -> true
POST /functions/v1/ai-weekly-review без JWT -> 401
OpenRouter model -> google/gemini-2.5-flash-lite
```

## Vector RAG smoke 25 июня 2026

Локально:

```text
supabase migration up -> applied 20260625204340_add_vector_rag.sql
knowledge_chunks.embedding -> vector(1024)
match_knowledge_chunks -> exists
HNSW index -> exists
RLS smoke -> user A sees only RLS smoke A
POST /functions/v1/rag-answer без JWT -> 401
```

Production rollout выполнен 26 июня 2026 по Москве:

```text
OpenRouter /embeddings baai/bge-m3 -> 200
embedding.length -> 1024
supabase db push -> migration applied
embed-knowledge-document deploy -> ok
rag-answer deploy -> ok
authenticated vector RAG smoke -> ok
embedDimensions -> 1024
ragMatchCount -> 1
citationCount -> 1
knowledge_answers created -> 1
smoke documents/answers cleanup -> ok
```
