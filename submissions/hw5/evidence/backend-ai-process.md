# AI-process evidence: backend-разработка и ревью

Дата фиксации: 20 июня 2026.
HEAD проверки: `9c13573`.

Этот файл фиксирует контрольный AI-process evidence для ДЗ 5: как AI применялся в backend-разработке FocusTrack AI под контролем разработчика. Evidence сверено с фактическими файлами Supabase, frontend-интеграции, тестами и backend-документацией.

## Связь с критерием

Критерии ДЗ 5:

- backend должен работать;
- должно быть не менее трех endpoints;
- frontend должен быть интегрирован с backend;
- auth/RLS/middleware должны ограничивать доступ;
- документация должна описывать backend и проверочный контур;
- применение AI в backend-разработке должно быть подтверждено не только декларацией, но и процессным evidence.

Проверяемые артефакты:

- `docs/backend/backend_architecture.md`;
- `docs/backend/backend_documentation.md`;
- `docs/backend/backend_report.md`;
- `supabase/config.toml`;
- `supabase/migrations/`;
- `supabase/functions/`;
- `supabase/functions/_shared/openrouter.ts`;
- `supabase/functions/_shared/logger.ts`;
- `supabase/functions/health/index.ts`;
- `src/lib/supabase.ts`;
- `src/lib/focustrack-api.ts`;
- `src/lib/focustrack-api.test.ts`;
- `tests/e2e/focustrack.spec.ts`;
- `submissions/hw5/evidence/logs/supabase-smoke.log`;
- `submissions/hw5/evidence/logs/live-supabase-e2e.log`.

## Промпт 1: backend design review

```text
Role: senior backend engineer and security reviewer.
Task: review the FocusTrack AI Supabase backend design for the homework MVP.
Context:
- Supabase Cloud, PostgreSQL, RLS, Auth, Edge Functions.
- AI/RAG endpoints: ai-clarify, ai-plan, ai-weekly-review, rag-answer.
- Public endpoint: health.
- OpenRouter key must stay server-side in Supabase secrets.
- Frontend uses Supabase client and Edge Functions.
Format:
- required backend components;
- risks;
- concrete implementation recommendations;
- acceptance checks.
```

### Зафиксированный вывод агента

Обязательные компоненты:

- migrations with user-owned tables and RLS;
- `verify_jwt=true` for AI/RAG functions;
- explicit public exception only for `health`;
- shared OpenRouter caller with server-side secret lookup;
- frontend API layer that degrades to demo mode when Supabase env/session is absent;
- tests for validation errors and demo fallbacks.

Риски:

- wildcard CORS can overexpose function responses;
- invalid JSON must return 400, not 500;
- anon/publishable tokens must not be enough for AI/RAG functions;
- OpenRouter timeout and non-JSON upstream errors must not leak internals;
- AI logs must not include secrets or raw tokens.

Рекомендации:

- replace wildcard CORS with `ALLOWED_ORIGINS` allowlist and `Vary: Origin`;
- add `ValidationError` for malformed JSON and bad payload shape;
- decode JWT role defensively and require `authenticated`;
- keep structured JSON logs with level, timestamp, function name and safe fields;
- cover API edge cases in unit tests.

## Промпт 2: implementation review

```text
Role: independent backend reviewer.
Task: compare the proposed backend practices with the actual FocusTrack AI files.
Context:
- supabase/functions/_shared/openrouter.ts
- supabase/functions/_shared/logger.ts
- supabase/functions/health/index.ts
- supabase/config.toml
- src/lib/focustrack-api.ts
- src/lib/focustrack-api.test.ts
- submissions/hw5/evidence/logs/supabase-smoke.log
Format:
- implemented;
- partially implemented;
- not implemented;
- verification commands.
```

### Зафиксированный вывод агента

| Область | Статус | Основание |
| --- | --- | --- |
| Edge Functions | implemented | `ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer`, `health` |
| JWT protection | implemented | AI/RAG функции требуют JWT; `health` открыт |
| RLS | implemented | миграции включают user-owned policies |
| OpenRouter server-side only | implemented | вызов модели находится в Supabase Edge Functions |
| CORS allowlist | implemented in source | `_shared/openrouter.ts` отражает только разрешенный `Origin`, добавляет `Vary: Origin` |
| Invalid JSON -> 400 | implemented | `readJson` выбрасывает `ValidationError("Некорректный JSON в запросе.")` |
| Payload size guard | implemented | `assertPayloadSize` ограничивает суммарный размер payload |
| Structured logs | implemented | `_shared/logger.ts` и вызовы `logEvent` в функциях |
| Live deploy parity | requires external deploy check | локальный source готов, live Supabase проверяется smoke-логами |
| Rate limiting | not implemented | оставлено production hardening задачей |

## Human review и принятое решение

Решение разработчика:

- принять рекомендации по CORS, безопасному JSON parsing, JWT role check и structured logging;
- не переносить OpenRouter во frontend;
- оставить rate limiting как production-задачу, а не блокер ДЗ 5;
- явно документировать расхождение source/live там, где внешний Supabase deploy требует отдельной проверки;
- покрыть frontend API-слой unit-тестами и e2e-сценариями, а backend surface — smoke-логами.

## Результат

| Требование | Evidence |
| --- | --- |
| Backend endpoints есть | `supabase/functions/` |
| Защита AI/RAG функций | `supabase/config.toml`, `supabase/functions/_shared/openrouter.ts` |
| RLS и grants | `supabase/migrations/` |
| Frontend integration | `src/lib/focustrack-api.ts`, `src/features/dashboard/focustrack-dashboard.tsx` |
| Unit/e2e проверки | `submissions/hw5/evidence/logs/unit-test.log`, `submissions/hw5/evidence/logs/e2e.log` |
| Live Supabase smoke | `submissions/hw5/evidence/logs/supabase-smoke.log`, `submissions/hw5/evidence/logs/live-supabase-e2e.log` |
| AI-process evidence | `submissions/hw5/evidence/backend-ai-process.md` |

## Ограничения evidence

- Файл фиксирует контрольный AI-process evidence 20 июня 2026 по текущему состоянию репозитория.
- Это не заменяет backend smoke-логи, Supabase project state и тесты; оно объясняет, как AI использовался при проектировании, ревью и закрытии backend-рисков.
