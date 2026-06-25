# Evidence — ДЗ 5

## Проверенные критерии

- Supabase backend работает;
- база данных синхронизирована с remote project;
- есть не менее 3 endpoints (`ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer`, `health`);
- для каждого endpoint в `docs/backend/backend_documentation.md` есть пример `curl` с контрактом запрос/ответ;
- AI/RAG функции защищены JWT (`verify_jwt=true`), публичный только `health`;
- CORS переведён с wildcard `*` на явный allowlist `ALLOWED_ORIGINS` с `Vary: Origin` (`_shared/openrouter.ts`, `health/index.ts`);
- во всех функциях включено структурированное JSON-логирование через `_shared/logger.ts`; `callOpenRouter` логирует латентность и ошибки модели;
- `rag-answer` отвечает по личным заметкам пользователя; fresh-user flow создаёт стартовый источник в `knowledge_documents` и сохраняет ответ в `knowledge_answers`;
- frontend интегрирован с Supabase client и Edge Functions;
- UI содержит рабочие формы и кнопки для `ai-clarify`, `ai-plan`, `rag-answer`, создания целей и переключения задач;
- live Supabase e2e подтверждает сохранение созданной цели и статуса задачи после reload (сценарий выполняется при заданных env `E2E_DEMO_EMAIL` / `E2E_DEMO_PASSWORD`, иначе пропускается);
- OpenRouter используется только серверно через Supabase secrets;
- AI применялся в backend-разработке как инженерная практика (генерация и ревью кода функций, миграций и документации под контролем разработчика).
- контрольный AI-process evidence backend-разработки сохранен в `backend-ai-process.md`.

## Проверенные файлы

- `supabase/config.toml`
- `supabase/migrations/`
- `supabase/functions/`
- `supabase/functions/_shared/logger.ts`
- `supabase/functions/_shared/openrouter.ts`
- `supabase/functions/health/index.ts`
- `src/lib/supabase.ts`
- `src/lib/focustrack-api.ts`
- `src/lib/focustrack-api.test.ts`
- `src/features/dashboard/focustrack-dashboard.tsx`
- `tests/e2e/focustrack.spec.ts`
- `docs/backend/backend_architecture.md`
- `docs/backend/backend_documentation.md`
- `docs/backend/backend_report.md`
- `submissions/hw5/evidence/backend-ai-process.md`

## AI-process evidence

- `backend-ai-process.md` — промпты backend design/implementation review, зафиксированный вывод агента, human review, принятые решения и привязка к тестам/логам.

## Логи

Прогон 19 июня 2026 (ветка `closure-docs-2026-06-19`), все шаги EXIT 0:

- `logs/typecheck.log` — typecheck, EXIT 0.
- `logs/lint.log` — lint, EXIT 0.
- `logs/unit-test.log` — unit-тесты: 35 passed (`progress.test.ts` + `focustrack-api.test.ts` + `auth.test.ts`).
- `logs/build.log` — production build, EXIT 0.
- `logs/e2e.log` — e2e: 9 passed / 11 skipped (desktop dashboard, AI-clarify/AI-plan, RAG, sidebar-навигация, strict 404, login dialog, delete goal, mobile usability; skip — кросс-проектные дубли и live-Supabase сценарий).
- `logs/supabase-smoke.log` — functions, secrets names, migrations, health 200, protected endpoint 401.
- `logs/live-supabase-e2e.log` — live Supabase login, создание цели и сохранение task status после reload.

Структурированные JSON-логи самих функций (`_shared/logger.ts`) пишутся в Supabase Functions logs: каждая запись — строка JSON `{level, ts, fn, message, ...поля}`, фильтруется по уровню `info|warn|error`.

## Медиа

- `media/dashboard-desktop-after-flow.png` — личный планировщик с жизненными целями после интеграции с backend и AI;
- `media/*.webm`.
