# ДЗ 6 — CI/CD, интеграции, безопасность, RAG

Ссылка Otus: https://otus.ru/learning/493766/#/homework-chat/47738/

## Что сдавать

| Требование                | Файл                                             |
| ------------------------- | ------------------------------------------------ |
| CI/CD                     | `.github/workflows/ci.yml`                       |
| Integration documentation | `docs/integrations/integration_documentation.md` |
| Security audit            | `docs/security/security_audit.md`                |
| RAG experiment            | `docs/research/002-knowledge-rag/experiment.md`  |
| Monitoring                | `supabase/functions/health/`                     |
| Structured logging        | `supabase/functions/_shared/logger.ts`           |
| Production deploy         | `docs/production-deployment.md`, `vercel.json`   |

Production URL:

```text
https://focustrack-ai.vercel.app
```

## Интеграции

- Google OAuth через Supabase Auth (`src/lib/auth.ts -> signInWithOAuth("google")`) — entry point реальный; сквозной вход через Google проверяется вручную, автоматизированного e2e-доказательства полного OAuth-цикла нет;
- Яндекс.Метрика реально инициализируется (`src/lib/analytics.ts -> initAnalytics()` из `src/main.tsx`); production-счётчик `110130059` активен через `VITE_YANDEX_METRIKA_ID`, без ID в локальной среде — безопасный no-op (события не отправляются); в UI вызывается не менее 3 `reachGoal`-событий;
- Supabase health endpoint;
- JWT protection для AI/RAG Edge Functions (`verify_jwt=true`), health открыт (`verify_jwt=false`);
- структурированное JSON-логирование Edge Functions (`supabase/functions/_shared/logger.ts`, уровни `info|warn|error`);
- CORS allowlist вместо wildcard `*` (`_shared/openrouter.ts`, `health/index.ts`);
- GitHub Actions quality gate;
- Vercel production deployment;
- controlled RAG experiment через OpenRouter (ответы по личным заметкам пользователя: журнал тренировок, бюджет, план IELTS).

## Проверка

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:e2e
pnpm audit
```

Фактическая проверка 19 июня 2026 (ветка `closure-docs-2026-06-19`, EXIT 0):

```text
pnpm run lint -> pass
pnpm run typecheck -> pass
pnpm run test -> 35 passed (3 файла: progress.test.ts + focustrack-api.test.ts + auth.test.ts)
pnpm run build -> pass
pnpm run test:e2e -> 9 passed / 11 skipped
pnpm audit --audit-level high -> No known vulnerabilities found
Vercel production deploy -> READY, https://focustrack-ai.vercel.app
GitHub Actions CI + Vercel deploy -> success
Production frontend smoke -> 200
GET /functions/v1/health -> 200, checks.database.reachable -> true
POST /functions/v1/ai-weekly-review без JWT -> 401
POST /functions/v1/ai-weekly-review с publishable/anon Bearer -> 401
GitHub Actions run 28139826719 -> Quality gate success, Vercel frontend deploy success
Production asset assets/index-BW00rx_I.js -> contains fresh-user RAG empty-state and starter-source flow
POST /functions/v1/rag-answer без JWT -> 401
Fresh-user RAG local smoke -> /knowledge empty-state -> стартовый источник -> rag-answer -> knowledge_answers
```

e2e: 9 реально проходящих сценариев (desktop dashboard flow, AI clarify+plan, RAG, sidebar-навигация, строгий 404, login-диалог, delete goal, закрытие demo-mode, mobile usability); 11 skipped — кросс-проектные дубли desktop/mobile и live-Supabase сценарий, который требует env `E2E_DEMO_EMAIL` / `E2E_DEMO_PASSWORD`.

## Повторная проверка 19 июня 2026

Статус ДЗ 6 после повторной сверки, исправления deploy-разрыва и доработок по замечаниям аудита: **закрыто**.

Закрыто:

- quality gate GitHub Actions описан;
- Supabase deploy job для migrations/functions есть;
- Vercel frontend deploy job добавлен;
- production URL работает: `https://focustrack-ai.vercel.app`;
- OAuth entry point (Supabase Auth), analytics helper, health endpoint, security audit и RAG experiment подготовлены;
- локальные проверки, Playwright e2e и production Playwright capture проходят.

Доработки, закрывающие ранее обязательные пробелы:

- **Логирование.** Реализовано структурированное JSON-логирование Edge Functions: `supabase/functions/_shared/logger.ts` — `logEvent(level, fn, message, fields)` и `createLogger(fn)`, уровни `info|warn|error`, каждая запись — строка JSON `{level, ts, fn, message, ...}`. Подключено в `ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer`, `health` и в `callOpenRouter` (`_shared/openrouter.ts` — латентность и ошибки модели). Пример AI-промпта для анализа логов добавлен в `docs/integrations/integration_documentation.md`.
- **Документирование использования AI.** Описано применение AI в CI/CD и анализе логов (`docs/integrations/integration_documentation.md`) и в аудите безопасности (`docs/security/security_audit.md`).
- **Аналитика.** Яндекс.Метрика реально инициализируется (`initAnalytics()` подгружает `tag.js`, определяет `window.ym`); production активен на `VITE_YANDEX_METRIKA_ID=110130059`. Честно: без заданного ID в локальной среде события не отправляются (no-op) — это конфигурируемо через env. Runtime-smoke 25 июня 2026 подтвердил загрузку `https://mc.yandex.ru/metrika/tag.js` и `window.ym` как `function`.
- **OAuth Google.** Entry point реальный (Supabase Auth, `src/lib/auth.ts`); сквозной вход через Google проверяется вручную. Автоматизированного e2e-доказательства полного OAuth-цикла в evidence нет.
- **CORS.** Wildcard `*` заменён на явный allowlist (`_shared/openrouter.ts`: `ALLOWED_ORIGINS` из env, по умолчанию prod + localhost; `corsHeaders(request)` отражает только разрешённый Origin + `Vary: Origin`); аналогично в `health/index.ts`.
- **Удалены неинтерактивные кнопки.** Декоративный Select из карточки «Категории целей» убран (рабочий — `rag-source-select`); sidebar-индикаторы Supabase/OpenRouter стали статусными строками.
- **Cursor-правила.** Подключены в нативном формате `.cursor/rules/focustrack.mdc` (`alwaysApply`, зеркало корневого `AGENTS.md`).
- **Unit-тесты.** Добавлен `src/lib/focustrack-api.test.ts` (валидация RAG-вопроса, пустой список документов, демо-фоллбэки без сессии, создание стартового RAG-источника, пересчёт прогресса `toggleTask`), а `src/lib/progress.test.ts` покрывает streak; итого 35 passed в 3 файлах.

Production evidence:

- `submissions/hw6/evidence/logs/vercel-deploy.log`;
- `submissions/hw6/evidence/logs/github-actions-final-run.json`;
- `submissions/hw6/evidence/logs/github-actions-final-production-smoke.log`;
- `submissions/hw6/evidence/logs/github-run-27682163117/vercel-deploy-url.txt`;
- `submissions/hw6/evidence/logs/vercel-production-smoke.log`;
- `submissions/hw6/evidence/logs/starter-rag-production-smoke.log`;
- `submissions/hw6/evidence/logs/playwright-production-capture.log`;
- `submissions/hw6/evidence/media/vercel-production/`.

## Текст для отправки

```text
Добрый день! Сдаю ДЗ 6 по FocusTrack AI.

Добавлены CI/CD, OAuth entry point (Supabase Auth), реальная инициализация Яндекс.Метрики,
health endpoint, JWT-protected AI/RAG Edge Functions, структурированное JSON-логирование,
CORS allowlist, security audit и RAG experiment. Использование AI задокументировано
(CI/CD, аудит безопасности, анализ логов).
Production: https://focustrack-ai.vercel.app

Проверка (25 июня 2026, EXIT 0): typecheck, lint, build, unit 35 passed,
e2e 9 passed / 11 skipped, pnpm audit без уязвимостей. RAG fresh-user flow проверен через создание стартового источника.

Основные файлы:
- .github/workflows/ci.yml
- vercel.json
- docs/production-deployment.md
- docs/integrations/integration_documentation.md
- docs/security/security_audit.md
- docs/research/002-knowledge-rag/experiment.md
- supabase/functions/_shared/logger.ts
```
