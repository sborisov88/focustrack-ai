# Evidence — ДЗ 5

## Проверенные критерии

- Supabase backend работает;
- база данных синхронизирована с remote project;
- есть не менее 3 endpoints;
- AI/RAG функции защищены JWT;
- frontend интегрирован с Supabase client и Edge Functions;
- OpenRouter используется только серверно через Supabase secrets.

## Проверенные файлы

- `supabase/config.toml`
- `supabase/migrations/`
- `supabase/functions/`
- `src/lib/supabase.ts`
- `src/lib/focustrack-api.ts`
- `docs/backend/backend_architecture.md`
- `docs/backend/backend_documentation.md`
- `docs/backend/backend_report.md`

## Логи

- `logs/supabase-smoke.log` — functions, secrets names, migrations, health 200, protected endpoint 401.
- `logs/e2e.log` — frontend сценарий с AI Review route.
- `logs/build.log` — production build.

## Медиа

- `media/dashboard-desktop-after-flow.png`
- `media/*.webm`
