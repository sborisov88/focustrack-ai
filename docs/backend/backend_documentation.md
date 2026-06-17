# Backend documentation

## Архитектура

FocusTrack AI использует Supabase-first backend:

- PostgreSQL для данных;
- Supabase Auth для пользователей;
- RLS для изоляции строк;
- Supabase Data API для CRUD;
- Edge Functions для AI и health-check;
- OpenRouter только со стороны сервера.

## Cloud project

Frontend подключается к Supabase через публичные переменные:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Секреты не коммитятся. `OPENROUTER_API_KEY` и `OPENROUTER_MODEL` заданы как Supabase secrets.

## Миграции

Основные миграции:

```text
supabase/migrations/20260617024511_init_focustrack_schema.sql
supabase/migrations/20260617033231_restrict_anon_table_grants.sql
```

Они создают и настраивают:

- enum-типы статусов;
- `profiles`;
- `goals`;
- `tasks`;
- `task_completions`;
- `ai_sessions`;
- `weekly_reviews`;
- `knowledge_documents`;
- `knowledge_answers`;
- индексы;
- triggers `updated_at`;
- RLS policies;
- явные grants для Data API;
- отзыв лишних прав `anon` и ограничение `authenticated` до CRUD + sequence access.

## Edge Functions

| Endpoint                         | Метод | Назначение                 |
| -------------------------------- | ----- | -------------------------- |
| `/functions/v1/ai-clarify`       | POST  | вопросы для уточнения цели |
| `/functions/v1/ai-plan`          | POST  | план задач                 |
| `/functions/v1/ai-weekly-review` | POST  | weekly review              |
| `/functions/v1/rag-answer`       | POST  | ответ по документам        |
| `/functions/v1/health`           | GET   | health-check               |

## Примеры запросов (`curl`)

Базовый URL: `https://wbxyyvvuqrhqtuywfeto.supabase.co/functions/v1/<name>`.

AI/RAG-функции защищены JWT и дополнительно проверяют роль токена внутри функции. Требуется заголовок `Authorization: Bearer <token>`, где `<token>` — Supabase access token текущей пользовательской сессии с ролью `authenticated`. Publishable/anon JWT без пользовательской сессии отклоняется с `401`. `health` открыт и вызывается без токена.

### `ai-clarify`

Контракт: `{goalTitle, description?, constraints?}` → `{type: "clarify", model, questions: [...], raw}`.

```bash
curl -X POST \
  https://wbxyyvvuqrhqtuywfeto.supabase.co/functions/v1/ai-clarify \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "goalTitle": "Пробежать полумарафон",
    "description": "Сейчас бегаю 5 км дважды в неделю",
    "constraints": ["3 тренировки в неделю", "без беговой дорожки"]
  }'
```

Ответ:

```json
{
  "type": "clarify",
  "model": "google/gemini-2.5-flash-lite",
  "questions": ["..."],
  "raw": "..."
}
```

### `ai-plan`

Контракт: `{goalTitle, targetDate?, answers?}` → `{type: "plan", model, plan}`.

```bash
curl -X POST \
  https://wbxyyvvuqrhqtuywfeto.supabase.co/functions/v1/ai-plan \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "goalTitle": "Пробежать полумарафон",
    "targetDate": "2026-10-01",
    "answers": {
      "Сколько тренировок в неделю?": "3",
      "Текущая дистанция?": "5 км"
    }
  }'
```

Ответ:

```json
{
  "type": "plan",
  "model": "google/gemini-2.5-flash-lite",
  "plan": "..."
}
```

### `ai-weekly-review`

Контракт: `{weekStart, completedTasks: [...], blockedTasks: [...], goalProgress}` → `{type: "weekly-review", model, review}`.

```bash
curl -X POST \
  https://wbxyyvvuqrhqtuywfeto.supabase.co/functions/v1/ai-weekly-review \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "weekStart": "2026-06-15",
    "completedTasks": ["Пробежка 12 км в темпе 5:40"],
    "blockedTasks": ["Интервальная тренировка"],
    "goalProgress": 58
  }'
```

Ответ:

```json
{
  "type": "weekly-review",
  "model": "google/gemini-2.5-flash-lite",
  "review": "..."
}
```

### `rag-answer`

Контракт: `{question, documents: [{title, content}]}` → `{type: "rag-answer", model, answer}`.

```bash
curl -X POST \
  https://wbxyyvvuqrhqtuywfeto.supabase.co/functions/v1/rag-answer \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Какой темп держать на длительной?",
    "documents": [
      {"title": "План недели", "content": "Длительная — 12 км в темпе 5:40."}
    ]
  }'
```

Ответ:

```json
{
  "type": "rag-answer",
  "model": "google/gemini-2.5-flash-lite",
  "answer": "..."
}
```

### `health`

`GET`, без токена. Возвращает `{service, status: "ok", checks: {edgeFunction, openRouterSecretConfigured, model}, checkedAt}`.

```bash
curl https://wbxyyvvuqrhqtuywfeto.supabase.co/functions/v1/health
```

Ответ:

```json
{
  "service": "focustrack-ai",
  "status": "ok",
  "checks": {
    "edgeFunction": true,
    "openRouterSecretConfigured": true,
    "model": "google/gemini-2.5-flash-lite"
  },
  "checkedAt": "2026-06-17T00:00:00.000Z"
}
```

## CORS

CORS-заголовки больше не используют wildcard `*`. Вместо него — явный allowlist разрешённых источников.

- Список источников задаётся секретом `ALLOWED_ORIGINS` (через запятую). По умолчанию — `https://focustrack-ai.vercel.app,http://localhost:5173`.
- `corsHeaders(request)` отражает в `Access-Control-Allow-Origin` только источник из allowlist; если `Origin` запроса не входит в список, подставляется первый разрешённый источник по умолчанию. Ко всем ответам добавляется `Vary: Origin`, чтобы кэши учитывали зависимость от источника.

Реализация:

- `supabase/functions/_shared/openrouter.ts` — `ALLOWED_ORIGINS`, `resolveAllowedOrigin(request)`, `corsHeaders(request)` и `handleOptions(request)` для AI/RAG-функций. Сигнатура хелпера ответа изменена на `jsonResponse(request, body, status = 200)` — он берёт корректные CORS-заголовки из `request`.
- `supabase/functions/health/index.ts` — собственный `corsHeaders(request)` с тем же allowlist (метод `GET, OPTIONS`).

## Логирование

Все Edge Functions пишут структурированные JSON-логи: каждая запись — отдельная строка JSON, что упрощает фильтрацию по уровню и анализ (в том числе AI-инструментами) в логах Supabase.

- Модуль `supabase/functions/_shared/logger.ts` предоставляет `logEvent(level, fn, message, fields)` и фабрику `createLogger(fn)` с методами `info` / `warn` / `error`.
- Уровни: `info | warn | error`. Запись уровня `error` идёт в `console.error`, `warn` — в `console.warn`, остальное — в `console.log`.
- Формат строки: `{ "level", "ts", "fn", "message", ...поля }`, где `ts` — ISO-метка времени, `fn` — имя функции, остальные поля приходят из вызова.
- Подключено в `ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer` и `health`. В `callOpenRouter` (`_shared/openrouter.ts`) логируются латентность ответа модели (`latencyMs`) и её ошибки — без раскрытия секретов и тел запросов.

## Безопасность

- OpenRouter ключ хранится только в Supabase secrets.
- Service role key не используется во frontend.
- Все пользовательские таблицы имеют RLS.
- Новые таблицы явно выданы роли `authenticated`, так как Cloud Supabase больше не обязан автоматически экспонировать новые таблицы через Data API.
- AI/RAG Edge Functions развернуты с `verify_jwt=true`.
- Публичным оставлен только `/functions/v1/health`, чтобы CI и мониторинг могли увидеть состояние сервиса без пользовательской сессии.

## Развертывание

Локально:

```bash
supabase start --workdir .
supabase db reset --workdir .
```

Cloud:

```bash
supabase link --project-ref <project-ref>
supabase db push --workdir . --yes
supabase functions deploy ai-clarify --workdir .
supabase functions deploy ai-plan --workdir .
supabase functions deploy ai-weekly-review --workdir .
supabase functions deploy rag-answer --workdir .
supabase functions deploy health --workdir .
```

## Проверки

- `supabase db push --workdir . --yes` применяет текущие миграции;
- локальная база стартует через Supabase CLI;
- `health` возвращает HTTP 200;
- `ai-weekly-review` без JWT возвращает HTTP 401;
- `health` показывает наличие server-side OpenRouter secret без раскрытия значения.
