# Prompt methodology

## Цель

Этот документ фиксирует, как FocusTrack AI использует AI-инструменты в разработке продукта: для декомпозиции требований, проверки архитектурных решений, проектирования запросов к модели и ревью рисков. Он описывает текущую реализацию, а не исторические черновики.

## Подход

Рабочий цикл строится вокруг коротких проверяемых промптов:

1. Сформулировать одну инженерную задачу.
2. Передать AI только релевантный контекст: продуктовую цель, ограничения, текущий стек и файлы, которые можно менять.
3. Запросить структурированный результат: список решений, рисков, тестов или JSON-контракт.
4. Проверить ответ по текущему коду, тестам и документации.
5. Сохранить только подтверждённые решения в коде или product docs.

AI-ответ не считается источником истины сам по себе. Источник истины для продукта — текущий код, миграции, тесты и production-smoke.

## Текущая модель данных

Актуальная схема хранится в `supabase/migrations/` и состоит из следующих пользовательских таблиц:

| Таблица                | Назначение                                           |
| ---------------------- | ---------------------------------------------------- |
| `profiles`             | профиль пользователя и настройки review              |
| `goals`                | цели пользователя                                    |
| `tasks`                | задачи внутри цели                                   |
| `task_completions`     | факты выполнения задач                               |
| `ai_sessions`          | журнал AI-вызовов, модели, входа, выхода и статуса   |
| `weekly_reviews`       | еженедельные AI-обзоры                               |
| `knowledge_documents`  | личные заметки пользователя                          |
| `knowledge_chunks`     | chunks заметок с `vector(1024)` embeddings           |
| `knowledge_answers`    | RAG-ответы с citations и retrieval metadata          |
| `function_invocations` | журнал rate-limit проверок защищённых Edge Functions |

Все пользовательские таблицы имеют `user_id`, RLS и owner-scoped policies. Новые таблицы получают явные grants для роли `authenticated`, потому что доступность через Data API не должна зависеть от implicit defaults.

## AI-контракты

| Сценарий          | Edge Function              | Вход                                   | Выход                                 | Сохранение                             |
| ----------------- | -------------------------- | -------------------------------------- | ------------------------------------- | -------------------------------------- |
| Уточнение цели    | `ai-clarify`               | черновик цели, описание, ограничения   | список вопросов                       | frontend сохраняет связанную AI-сессию |
| Планирование      | `ai-plan`                  | цель, дедлайн, ответы                  | краткий план и задачи                 | frontend сохраняет `tasks` и AI-сессию |
| Weekly review     | `ai-weekly-review`         | completed/blocked tasks и progress     | обзор недели                          | `weekly_reviews` и AI-сессия           |
| Индексация знания | `embed-knowledge-document` | `documentId`                           | статус, chunks, модель, размерность   | `knowledge_chunks`, статус документа   |
| Ответ по заметкам | `rag-answer`               | вопрос и optional `selectedDocumentId` | grounded answer, citations, retrieval | `knowledge_answers`                    |

OpenRouter вызывается только из Supabase Edge Functions. Frontend не хранит LLM-секреты и не вызывает модель напрямую.

## Rate limit и безопасность запросов

Защищённые Edge Functions требуют пользовательский JWT и используют общий rate-limit слой:

- `requireAuthenticatedUser(request)` проверяет роль `authenticated` и наличие `sub`;
- `createUserSupabaseClient(request)` создаёт user-scoped client с тем же JWT;
- `enforceRateLimit(...)` пишет событие в `function_invocations` и возвращает `429` при превышении лимита;
- лимит по умолчанию: 60 запросов на функцию за 3600 секунд;
- настройка: `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS`, либо `RATE_LIMIT_<FUNCTION>_MAX`.

Ошибки возвращаются в едином JSON-формате. Для rate limit ответ содержит:

```json
{
  "error": "Слишком много запросов. Повторите позже.",
  "retryAfterSeconds": 3600
}
```

## Примеры рабочих промптов

### Проверка RLS

```text
Проверь текущие миграции Supabase. Найди все таблицы public, укажи,
есть ли enable row level security, owner-scoped select/insert/update/delete
policies и явные grants для authenticated. Верни только подтверждённые
расхождения с file:line.
```

### Проверка Edge Function

```text
Проверь Edge Function <name>. Убедись, что она проверяет JWT, валидирует
payload, не логирует секреты, использует общий CORS helper, корректно
возвращает ошибки и не вызывает OpenRouter из frontend-контекста.
```

### Проверка product docs

```text
Сверь публичную документацию с текущими файлами src/, supabase/ и .github/.
Найди устаревшие утверждения, ссылки на несуществующие artifacts, fixed
asset hashes и внутренние процессные маркеры. Верни список правок.
```

## Проверка результата

Каждый AI-assisted шаг считается завершённым только после инженерной проверки:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:e2e
pnpm audit --audit-level high
```

Для Edge Functions дополнительно выполняется:

```bash
(cd supabase/functions/ai-clarify && deno check --no-lock --node-modules-dir=auto index.ts)
(cd supabase/functions/ai-plan && deno check --no-lock --node-modules-dir=auto index.ts)
(cd supabase/functions/ai-weekly-review && deno check --no-lock --node-modules-dir=auto index.ts)
(cd supabase/functions/rag-answer && deno check --no-lock --node-modules-dir=auto index.ts)
(cd supabase/functions/embed-knowledge-document && deno check --no-lock --node-modules-dir=auto index.ts)
(cd supabase/functions/health && deno check --no-lock --node-modules-dir=auto index.ts)
```
