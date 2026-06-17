# ДЗ 5 — backend documentation

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

## Пример `ai-weekly-review`

```json
{
  "weekStart": "2026-06-15",
  "completedTasks": ["Собрать product specification"],
  "blockedTasks": ["Деплой frontend"],
  "goalProgress": 58
}
```

Ответ:

```json
{
  "type": "weekly-review",
  "model": "google/gemini-2.5-flash-lite",
  "review": "..."
}
```

## Безопасность

- OpenRouter ключ хранится только в Supabase secrets.
- Service role key не используется во frontend.
- Все пользовательские таблицы имеют RLS.
- Новые таблицы явно выданы роли `authenticated`, так как Cloud Supabase больше не обязан автоматически экспонировать новые таблицы через Data API.
- AI/RAG Edge Functions развернуты с `verify_jwt=true`.
- Публичным оставлен только `/functions/v1/health`, чтобы CI и проверяющий могли увидеть состояние сервиса без пользовательской сессии.

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
