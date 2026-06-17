# Evidence — проектная работа

## Проверенные критерии

- MVP запускается, собирается и проходит happy path на жизненной цели (создание цели -> AI-уточнение -> AI-план -> задачи и прогресс -> weekly review -> RAG-вопрос по личным заметкам);
- Supabase backend, RLS, Edge Functions и OpenRouter настроены;
- AI применяется в продукте через server-side Edge Functions, а UI вызывает `ai-clarify`, `ai-plan`, `ai-weekly-review` и `rag-answer`;
- подготовлены README, архитектура, промпты, roadmap, презентационный план и evidence;
- Playwright e2e: 6 passed / 8 skipped — desktop dashboard flow, AI-уточнение/AI-план, RAG-вопрос, sidebar-навигация, login dialog, mobile usability;
- skip покрывают кросс-проектные дубли desktop/mobile и live-Supabase сценарий, который требует env `E2E_DEMO_EMAIL`/`E2E_DEMO_PASSWORD` (persistence создания цели и статуса задачи после reload);
- unit-тесты: 12 passed в 2 файлах (`src/lib/progress.test.ts` + `src/lib/focustrack-api.test.ts`).

## Изменения итерации (аудит, ветка `audit-remediation-2026-06-17`)

- убраны 2 неинтерактивные «мёртвые» кнопки UI: декоративный селектор `data-testid="knowledge-source-select"` удалён из карточки «Категории целей» (рабочий селектор источника RAG — `rag-source-select`, `src/features/dashboard/focustrack-dashboard.tsx`); индикаторы Supabase/OpenRouter в sidebar теперь обычные статусные строки (`<span>`), а не кликабельные кнопки;
- расширено unit-покрытие: новый `src/lib/focustrack-api.test.ts` — валидация короткого RAG-вопроса (throws «Введите вопрос по заметкам.») и пустого списка документов (throws «Нет документов для RAG-ответа.»), демо-фоллбэки `requestGoalClarification`/`requestGoalPlan`/`requestRagAnswer` без сессии, пересчёт прогресса в `toggleTask` и edge на несуществующую задачу;
- бэкенд: структурированное JSON-логирование (`supabase/functions/_shared/logger.ts` — `logEvent`/`createLogger`, уровни info|warn|error), подключено в `ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer`, `health` и в `callOpenRouter` (латентность и ошибки модели); CORS-wildcard `*` заменён на явный allowlist из env `ALLOWED_ORIGINS` с `Vary: Origin` (`supabase/functions/_shared/openrouter.ts`, `health/index.ts`);
- фронтенд: реальная инициализация Яндекс.Метрики (`src/lib/analytics.ts` -> `initAnalytics()` вызывается из `src/main.tsx` до рендера), активна только при заданном `VITE_YANDEX_METRIKA_ID` (> 0), иначе безопасный no-op; `trackEvent` отправляет reachGoal-события (в UI задействовано не менее 3 событий);
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
- `submissions/acceptance-matrix.md`

## Артефакты для преподавателя

- основной репозиторий: `https://github.com/sborisov88/focustrack-ai`;
- финальная проектная работа: `submissions/final-project/README.md`;
- матрица приемки: `submissions/acceptance-matrix.md`;
- production demo: `https://focustrack-ai.vercel.app`;
- демо-доступ: `DEMO_ACCESS.md`;
- опубликованный финальный checkpoint: `final-project-submitted`;
- опубликованные checkpoints по ДЗ: `hw1-submitted`, `hw2-submitted`, `hw3-submitted`, `hw4-submitted`, `hw5-submitted`, `hw6-submitted`.

## Логи

- `logs/pnpm-install.log`
- `logs/lint.log`
- `logs/typecheck.log`
- `logs/unit-test.log`
- `logs/build.log`
- `logs/audit.log`
- `logs/unit-test.log` — unit-тесты (`src/lib/progress.test.ts` + `src/lib/focustrack-api.test.ts`), 12 passed.
- `logs/e2e.log` — Playwright: 6 passed / 8 skipped, включая AI-clarify/AI-plan и RAG.
- `logs/live-supabase-e2e.log` — live login, создание цели и task toggle через Supabase с проверкой после reload (требует env `E2E_DEMO_EMAIL`/`E2E_DEMO_PASSWORD`).
- `logs/supabase-smoke.log`
- `logs/tooling.log`

## Медиа

- `media/dashboard-desktop-initial.png` — дашборд нового UI: «Категории целей» и «Личный планировщик» с жизненными целями (полумарафон, IELTS, подушка безопасности, лендинг пет-проекта);
- `media/dashboard-desktop-after-flow.png` — состояние после сценария: отмеченная задача и пересчитанный прогресс по цели;
- `media/dashboard-mobile.png` — мобильный вид планировщика личных и рабочих целей;
- `media/*.webm` — Playwright-записи сквозных сценариев на жизненных целях;
- `media/html-report/index.html` — HTML-отчет Playwright;
- `media/vercel-production/` — скриншоты production-деплоя https://focustrack-ai.vercel.app.
