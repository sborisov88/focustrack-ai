# Evidence — ДЗ 5

## Проверенные критерии

- Supabase backend работает;
- база данных синхронизирована с remote project;
- есть не менее 3 endpoints;
- AI/RAG функции защищены JWT;
- `rag-answer` отвечает по личным заметкам пользователя (журнал тренировок, бюджет, план IELTS);
- frontend интегрирован с Supabase client и Edge Functions;
- UI содержит рабочие формы и кнопки для `ai-clarify`, `ai-plan`, `rag-answer`, создания целей и переключения задач;
- live Supabase e2e подтверждает сохранение созданной цели и статуса задачи после reload;
- OpenRouter используется только серверно через Supabase secrets.

## Проверенные файлы

- `supabase/config.toml`
- `supabase/migrations/`
- `supabase/functions/`
- `src/lib/supabase.ts`
- `src/lib/focustrack-api.ts`
- `src/features/dashboard/focustrack-dashboard.tsx`
- `tests/e2e/focustrack.spec.ts`
- `docs/backend/backend_architecture.md`
- `docs/backend/backend_documentation.md`
- `docs/backend/backend_report.md`

## Логи

- `logs/supabase-smoke.log` — functions, secrets names, migrations, health 200, protected endpoint 401.
- `logs/e2e.log` — frontend сценарии: dashboard, AI-clarify/AI-plan, RAG-вопрос, navigation, login dialog, mobile usability.
- `logs/live-supabase-e2e.log` — live Supabase login, создание цели и сохранение task status после reload.
- `logs/build.log` — production build.

## Медиа

- `media/dashboard-desktop-after-flow.png` — личный планировщик с жизненными целями после интеграции с backend и AI;
- `media/*.webm`.
