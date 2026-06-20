# Development log

## 2026-06-17

- Создан React/Vite frontend на shadcn/ui.
- Добавлены Supabase migration, RLS policies и grants.
- Добавлены Edge Functions для OpenRouter и health-check.
- Supabase Cloud linked, migrations synced.
- OpenRouter secrets сохранены в Supabase secrets.
- Добавлены Playwright e2e, screenshots и video output.
- Финальный локальный gate прошёл: `lint`, `typecheck`, `test`, `build`, `test:e2e`.
- `pnpm audit --audit-level high` не нашёл известных уязвимостей.
- `supabase db push --workdir . --yes` подтвердил, что remote database up to date.
- Добавлена и применена миграция `20260617033231_restrict_anon_table_grants.sql`: у `anon` нет прямых прав на продуктовые таблицы, `authenticated` ограничен CRUD.
- AI/RAG Edge Functions (`ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer`) переопубликованы с `verify_jwt=true`; `health` оставлен публичным.
- Supabase smoke: `GET /functions/v1/health -> 200` с проверкой `checks.database.reachable`, `POST /functions/v1/ai-weekly-review` без JWT -> `401`.
- Повторный gate 17 июня 2026 прошёл: `lint`, `typecheck`, `test`, `build`, `pnpm audit --audit-level high`, `test:e2e`.
- Свежие Playwright screenshots/video сохранены в `output/playwright/`.

## Следующий шаг

После локальной проверки можно публиковать изменения в GitHub и продолжать production hardening (авторизация, AI rate limits).
