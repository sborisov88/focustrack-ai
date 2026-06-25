# Evidence — проектная работа

## Проверенные критерии

- MVP запускается, собирается и проходит happy path на жизненной цели (создание цели -> AI-уточнение -> AI-план -> задачи и прогресс -> weekly review -> RAG-вопрос по личным заметкам);
- Supabase backend, RLS, Edge Functions и OpenRouter настроены;
- AI применяется в продукте через server-side Edge Functions, а UI вызывает `ai-clarify`, `ai-plan`, `ai-weekly-review` и `rag-answer`;
- подготовлены README, архитектура, промпты, roadmap, презентационный план и evidence;
- Playwright e2e: 9 passed / 11 skipped — desktop dashboard flow, AI-уточнение/AI-план, RAG-вопрос, sidebar-навигация, strict 404, login dialog, delete goal, demo close, mobile usability;
- skip покрывают кросс-проектные дубли desktop/mobile и live-Supabase сценарий, который требует env `E2E_DEMO_EMAIL`/`E2E_DEMO_PASSWORD` (persistence создания цели и статуса задачи после reload);
- unit-тесты: 35 passed в 3 файлах (`src/lib/progress.test.ts` + `src/lib/focustrack-api.test.ts` + `src/lib/auth.test.ts`).

## Изменения итерации (аудит, ветка `closure-docs-2026-06-19`)

- убраны 2 неинтерактивные «мёртвые» кнопки UI: декоративный селектор `data-testid="knowledge-source-select"` удалён из карточки «Категории целей» (рабочий селектор источника RAG — `rag-source-select`, `src/features/dashboard/focustrack-dashboard.tsx`); индикаторы Supabase/OpenRouter в sidebar теперь обычные статусные строки (`<span>`), а не кликабельные кнопки;
- расширено unit-покрытие: новый `src/lib/focustrack-api.test.ts` — валидация короткого RAG-вопроса (throws «Введите вопрос по заметкам.») и пустого списка документов (throws «Нет документов для RAG-ответа.»), демо-фоллбэки `requestGoalClarification`/`requestGoalPlan`/`requestRagAnswer` без сессии, пересчёт прогресса в `toggleTask` и edge на несуществующую задачу;
- fresh-user RAG закрыт в UI: если у Supabase-пользователя ещё нет источников, `/knowledge` показывает empty-state с действием «Создать стартовый источник», пишет строку в `knowledge_documents`, разблокирует `rag-answer` и сохраняет ответ в `knowledge_answers`;
- бэкенд: структурированное JSON-логирование (`supabase/functions/_shared/logger.ts` — `logEvent`/`createLogger`, уровни info|warn|error), подключено в `ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer`, `health` и в `callOpenRouter` (латентность и ошибки модели); CORS-wildcard `*` заменён на явный allowlist из env `ALLOWED_ORIGINS` с `Vary: Origin` (`supabase/functions/_shared/openrouter.ts`, `health/index.ts`);
- фронтенд: реальная инициализация Яндекс.Метрики (`src/lib/analytics.ts` -> `initAnalytics()` вызывается из `src/main.tsx` до рендера), production активен на `VITE_YANDEX_METRIKA_ID=110130059`, иначе в локальной среде безопасный no-op; `trackEvent` отправляет reachGoal-события (в UI задействовано не менее 3 событий); live-smoke 25 июня 2026 подтвердил загрузку `https://mc.yandex.ru/metrika/tag.js` и `window.ym` как `function`;
- Google OAuth подключён через Supabase Auth (`src/lib/auth.ts`) — entry point реальный; автоматического end-to-end доказательства входа через Google в evidence нет, проверяется вручную.

## Проверенные файлы

- `README.md`
- `ROADMAP.md`
- `docs/architecture/architecture.md`
- `docs/architecture/adr/001-tech-stack.md`
- `docs/product/`
- `docs/prompts/`
- `docs/backend/`
- `docs/security/security_audit.md`
- `submissions/final-project/presentation.md`

## Артефакты для преподавателя

- основной репозиторий: `https://github.com/sborisov88/focustrack-ai`;
- финальная проектная работа: `submissions/final-project/README.md`;
- production demo: `https://focustrack-ai.vercel.app`;
- демо-доступ: `DEMO_ACCESS.md`;
- опубликованный финальный checkpoint: `final-project-submitted` (`486a2d6`); актуальный production feature commit на `main` — `c1b0216` (fresh-user RAG flow);
- опубликованные checkpoints по ДЗ: `hw1-submitted`, `hw2-submitted`, `hw3-submitted`, `hw4-submitted`, `hw5-submitted`, `hw6-submitted`.

## Логи

- `logs/pnpm-install.log`
- `logs/lint.log`
- `logs/typecheck.log`
- `logs/unit-test.log`
- `logs/build.log`
- `logs/audit.log`
- `logs/unit-test.log` — unit-тесты (`src/lib/progress.test.ts` + `src/lib/focustrack-api.test.ts` + `src/lib/auth.test.ts`), 35 passed.
- `logs/e2e.log` — Playwright: 9 passed / 11 skipped, включая AI-clarify/AI-plan, RAG и strict 404.
- `logs/live-supabase-e2e.log` — live login, создание цели и task toggle через Supabase с проверкой после reload (требует env `E2E_DEMO_EMAIL`/`E2E_DEMO_PASSWORD`).
- `logs/start-check.log` — `FOCUSTRACK_CHECK_ONLY=1 ./start.sh`, one-command cloud-only smoke: production frontend 200 и Supabase health 200.
- `logs/supabase-smoke.log`
- `logs/starter-rag-production-smoke.log` — GitHub Actions run `28139826719`, production asset `assets/index-BW00rx_I.js`, `GET /knowledge -> 200`, health `200`, protected `rag-answer` без JWT `401`, local authenticated smoke `/knowledge -> стартовый источник -> rag-answer -> knowledge_answers`.
- `logs/tooling.log`

## Медиа

- `media/dashboard-desktop-initial.png` — дашборд нового UI: «Категории целей» и «Личный планировщик» с жизненными целями (полумарафон, IELTS, подушка безопасности, лендинг пет-проекта);
- `media/dashboard-desktop-after-flow.png` — состояние после сценария: отмеченная задача и пересчитанный прогресс по цели;
- `media/dashboard-mobile.png` — мобильный вид планировщика личных и рабочих целей;
- `media/*.webm` — Playwright-записи сквозных сценариев на жизненных целях;
- `media/html-report/index.html` — HTML-отчет Playwright;
- `media/vercel-production/` — скриншоты production-деплоя https://focustrack-ai.vercel.app.
