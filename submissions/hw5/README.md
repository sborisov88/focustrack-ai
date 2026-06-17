# ДЗ 5 — Backend и интеграция с Frontend

Ссылка Otus: https://otus.ru/learning/493766/#/homework-chat/47737/

## Что сдавать

| Требование            | Файл                                               |
| --------------------- | -------------------------------------------------- |
| Backend architecture  | `docs/backend/backend_architecture.md`             |
| Backend documentation | `docs/backend/backend_documentation.md`            |
| Backend debug report  | `docs/backend/backend_report.md`                   |
| Миграции              | `supabase/migrations/`                             |
| Edge Functions        | `supabase/functions/`                              |
| Shared logger / CORS  | `supabase/functions/_shared/logger.ts`, `supabase/functions/_shared/openrouter.ts` |
| Frontend integration  | `src/lib/supabase.ts`, `src/lib/focustrack-api.ts` |
| E2E checks            | `tests/e2e/focustrack.spec.ts`                     |

## Инфраструктура

- Supabase Cloud;
- PostgreSQL 17;
- RLS policies;
- `anon` без прямых прав на продуктовые таблицы;
- `authenticated` с CRUD-правами через RLS;
- Supabase Edge Functions;
- OpenRouter через Supabase secrets;
- AI/RAG функции с `verify_jwt=true`, публичный только `health`;
- CORS переведён с wildcard `*` на явный allowlist `ALLOWED_ORIGINS` (с `Vary: Origin`) в `_shared/openrouter.ts` и `health`;
- структурированное JSON-логирование во всех функциях (`_shared/logger.ts`);
- frontend создает цели и переключает задачи через Supabase при активной сессии;
- `ai-clarify`, `ai-plan` и `rag-answer` доступны из UI;
- `rag-answer` отвечает по личным заметкам пользователя (журнал тренировок, бюджет, план подготовки к IELTS).

## Доработки этой итерации (audit-remediation 2026-06-17)

- В `docs/backend/backend_documentation.md` добавлены примеры `curl` для каждого endpoint: `ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer`, `health` (с контрактами запрос/ответ).
- CORS: wildcard `*` заменён на allowlist из секрета `ALLOWED_ORIGINS` (по умолчанию `https://focustrack-ai.vercel.app,http://localhost:5173`); `corsHeaders(request)` отражает только разрешённый `Origin` и добавляет `Vary: Origin`. Сигнатура хелпера ответа — `jsonResponse(request, body, status = 200)`.
- Структурированное JSON-логирование: модуль `_shared/logger.ts` (`logEvent` / `createLogger`, уровни `info|warn|error`, запись — строка JSON `{level, ts, fn, message, ...поля}`); подключено в пять функций и в `callOpenRouter` (латентность модели и её ошибки).
- Использование AI в backend-разработке оформлено как инженерная практика: AI применялся для генерации/ревью кода функций, миграций и документации под контролем разработчика; формат JSON-логов рассчитан в том числе на анализ AI-инструментами.

## Проверка

```bash
supabase db push --workdir . --yes
supabase functions deploy ai-clarify --workdir .
supabase functions deploy ai-plan --workdir .
supabase functions deploy ai-weekly-review --workdir .
supabase functions deploy rag-answer --workdir .
supabase functions deploy health --workdir .
```

Примеры `curl` для каждого endpoint (с контрактами запрос/ответ) приведены в `docs/backend/backend_documentation.md`.

Фактический прогон 17 июня 2026 (ветка `audit-remediation-2026-06-17`, все шаги EXIT 0):

```text
typecheck -> EXIT 0
lint -> EXIT 0
unit -> 12 passed (progress.test.ts + focustrack-api.test.ts)
build -> EXIT 0
e2e -> 6 passed / 8 skipped
supabase db push --workdir . --yes -> применена 20260617033231_restrict_anon_table_grants.sql
GET /functions/v1/health -> 200
POST /functions/v1/ai-weekly-review без JWT -> 401
```

E2E: 6 реально проходящих сценариев (desktop dashboard flow, AI clarify+plan, RAG, sidebar-навигация, login-диалог, mobile usability); 8 skip — кросс-проектные дубли desktop/mobile и live-Supabase сценарий, требующий env `E2E_DEMO_EMAIL` / `E2E_DEMO_PASSWORD`.

## Текст для отправки

```text
Добрый день! Сдаю ДЗ 5 по FocusTrack AI.

Backend развернут на Supabase Cloud. В репозитории есть миграции, RLS policies, ограниченные grants, JWT-protected Edge Functions и frontend-интеграция.
В документации добавлены примеры curl для каждого endpoint. CORS переведён с wildcard на явный allowlist (ALLOWED_ORIGINS, Vary: Origin), добавлено структурированное JSON-логирование во всех функциях.
Frontend вызывает AI-уточнение, AI-план, RAG-вопрос и сохраняет создание целей/статусы задач через Supabase при активной сессии.
Документация:
- docs/backend/backend_documentation.md
- docs/backend/backend_report.md
- supabase/migrations/
- supabase/functions/
```
