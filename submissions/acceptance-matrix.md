# Матрица приемки OTUS

Дата проверки: 17 июня 2026.

## Общий проверочный контур

| Проверка | Результат | Evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | pass | `output/verification/logs/pnpm-install.log` |
| `pnpm run lint` | pass | `output/verification/logs/lint.log` |
| `pnpm run typecheck` | pass | `output/verification/logs/typecheck.log` |
| `pnpm run test` | pass, 12 unit tests в 2 файлах | `output/verification/logs/unit-test.log` |
| `pnpm run build` | pass | `output/verification/logs/build.log` |
| `pnpm audit --audit-level high` | pass, no known vulnerabilities | `output/verification/logs/audit.log` |
| `pnpm run test:e2e` | pass, 6 выполненных Playwright сценариев, 8 project-specific skipped | `output/verification/logs/e2e.log` |
| Live Supabase e2e | pass, demo login, persisted goal creation and task status after reload | `output/verification/logs/live-supabase-e2e.log` |
| Supabase smoke | health 200, protected AI endpoint 401 without JWT | `output/verification/logs/supabase-smoke.log` |
| Vercel production deploy | READY, public frontend URL works | `output/verification/logs/vercel-deploy.log`, `output/verification/logs/vercel-production-smoke.log` |
| GitHub Actions deploy after push | success, quality gate and Vercel deploy job passed | `output/verification/logs/github-actions-final-run.json`, `output/verification/logs/github-actions-final-production-smoke.log` |
| Production Playwright capture | screenshots and videos saved | `output/playwright/production/` |

## ДЗ 1

| Критерий | Артефакт | Проверка | Evidence |
| --- | --- | --- | --- |
| Все 6 шагов задания | `docs/research/001-ai-tooling/report.md` | структура отчета покрывает требования, сравнение, выбор, настройку и практику | `submissions/hw1/evidence/README.md` |
| Минимум 4 инструмента, 2 cloud + 2 IDE/CLI | `docs/research/001-ai-tooling/comparison_table.md` | таблица содержит 7 инструментов | `submissions/hw1/evidence/logs/` |
| Выбор обоснован | `docs/research/001-ai-tooling/tool_selection.md` | выбран Codex, альтернативы рассмотрены | `submissions/hw1/README.md` |
| Инструмент установлен и проверен | `docs/research/001-ai-tooling/setup_guide.md`, `submissions/hw1/evidence/logs/tooling.log` | версии Node, pnpm, npx, Supabase CLI сохранены | `submissions/hw1/evidence/logs/tooling.log` |

## ДЗ 2

| Критерий | Артефакт | Проверка | Evidence |
| --- | --- | --- | --- |
| Все шаги задания | `docs/prompts/` | есть rules, templates, methodology, testing | `submissions/hw2/evidence/README.md` |
| Не менее 10 rules | `docs/prompts/rules.md` | набор правил выделен отдельным документом | `submissions/hw2/README.md` |
| Не менее 5 RTCF-шаблонов | `docs/prompts/prompt_templates.md` | шаблоны оформлены для FocusTrack AI | `submissions/hw2/README.md` |
| CoT и улучшение с rules задокументированы | `docs/prompts/prompt_methodology.md`, `docs/prompts/testing.md` | описана методология и примеры применения | `submissions/hw2/evidence/logs/` |

## ДЗ 3

| Критерий | Артефакт | Проверка | Evidence |
| --- | --- | --- | --- |
| Все 7 шагов | `docs/product/` | описание, UI-концепции, stories, ТЗ и ADR есть | `submissions/hw3/README.md` |
| Не менее 3 UI-концепций | `docs/product/ui_concepts/ui_description.md` | UI-концепции описаны | `submissions/hw3/evidence/media/` |
| Не менее 5 User Stories и Gherkin AC | `docs/product/user_stories.md` | stories и Given/When/Then критерии оформлены для жизненных целей (полумарафон, IELTS, подушка безопасности, лендинг пет-проекта) | `submissions/hw3/evidence/README.md` |
| ТЗ готово для AI-инженера | `docs/product/technical_specification.md` | проверено сборкой и e2e MVP | `submissions/hw3/evidence/logs/e2e.log` |

## ДЗ 4

| Критерий | Артефакт | Проверка | Evidence |
| --- | --- | --- | --- |
| Приложение запускается | `package.json`, `src/` | build и Playwright прошли | `submissions/hw4/evidence/logs/` |
| Не менее 3 функций из ТЗ | `src/features/dashboard/focustrack-dashboard.tsx` | цель, задачи, прогресс, AI Review, категории целей, responsive UI на демо с жизненными целями; удалены 2 неинтерактивные «мёртвые» кнопки (декоративный Select категорий и sidebar-индикаторы Supabase/OpenRouter заменены на статусные строки) | `submissions/hw4/evidence/media/` |
| Адаптивность | `tests/e2e/focustrack.spec.ts` | desktop и mobile сценарии Playwright | `submissions/hw4/evidence/logs/e2e.log` |
| Не менее 3 тестов | `src/lib/progress.test.ts`, `src/lib/focustrack-api.test.ts`, `tests/e2e/focustrack.spec.ts` | 12 unit-тестов в 2 файлах (включая обработку ошибок RAG-вопроса/документов, демо-фоллбэки и edge-кейсы toggleTask) и 6 выполненных e2e сценариев из 8 (8 skipped) | `submissions/hw4/evidence/logs/unit-test.log`, `submissions/hw4/evidence/logs/e2e.log` |
| AI-инструменты подключены | `.cursor/rules/focustrack.mdc`, `AGENTS.md` | Cursor-правила в нативном формате (`alwaysApply`, зеркало корневого `AGENTS.md`) | `.cursor/rules/focustrack.mdc` |
| Аналитика поведения | `src/lib/analytics.ts`, `src/main.tsx` | Яндекс.Метрика инициализируется в `main.tsx` до рендера (активна только при `VITE_YANDEX_METRIKA_ID > 0`, иначе безопасный no-op); `trackEvent` отправляет reachGoal-события в UI | `submissions/hw4/evidence/logs/` |

## ДЗ 5

| Критерий | Артефакт | Проверка | Evidence |
| --- | --- | --- | --- |
| Backend работает | `supabase/migrations/`, `supabase/functions/` | remote database up to date, health 200 | `submissions/hw5/evidence/logs/supabase-smoke.log` |
| Не менее 3 endpoints | `supabase/functions/`, `docs/backend/backend_documentation.md` | ai-clarify, ai-plan, ai-weekly-review, rag-answer (POST, JWT) + health (GET, открыт); контракты запроса/ответа задокументированы JSON-примерами в backend_documentation.md | `submissions/hw5/evidence/logs/supabase-smoke.log` |
| E2E интеграция | `src/lib/focustrack-api.ts`, `src/lib/focustrack-api.test.ts`, `tests/e2e/focustrack.spec.ts` | UI вызывает `ai-clarify`, `ai-plan`, `rag-answer`; создание цели и task toggle сохраняются через Supabase при активной сессии; обработка ошибок/edge-кейсов покрыта unit-тестами (12 unit всего), e2e 6 passed / 8 skipped | `submissions/hw5/evidence/logs/e2e.log`, `submissions/hw5/evidence/logs/live-supabase-e2e.log` |
| Auth + RLS/middleware | `supabase/migrations/`, `supabase/config.toml`, `supabase/functions/_shared/openrouter.ts` | AI/RAG functions protected (`verify_jwt=true`), health открыт (`verify_jwt=false`); CORS wildcard `*` заменён на явный allowlist с `Vary: Origin` (`openrouter.ts:42`, `health/index.ts:24`); no-JWT smoke 401 | `submissions/hw5/evidence/logs/supabase-smoke.log` |
| Структурированное логирование | `supabase/functions/_shared/logger.ts` | `logEvent`/`createLogger` пишут строки JSON `{level, ts, fn, message, ...}` (info/warn/error); подключено в ai-clarify, ai-plan, ai-weekly-review, rag-answer, health и в `callOpenRouter` (латентность и ошибки модели) | `submissions/hw5/evidence/logs/supabase-smoke.log` |

## ДЗ 6

| Критерий | Артефакт | Проверка | Evidence |
| --- | --- | --- | --- |
| CI/CD работает | `.github/workflows/ci.yml`, `vercel.json` | quality gate и Vercel frontend deploy job успешно прошли после push в `main` | `submissions/hw6/evidence/logs/github-actions-final-run.json` |
| Не менее 2 интеграций | `docs/integrations/integration_documentation.md`, `src/lib/auth.ts`, `src/lib/analytics.ts` | Google OAuth через Supabase Auth (entry point реальный; автоматического e2e-доказательства входа через Google нет, проверяется вручную), Яндекс.Метрика (`initAnalytics`), Supabase health, OpenRouter | `submissions/hw6/README.md` |
| Audit проведен | `docs/security/security_audit.md` | `pnpm audit --audit-level high` pass | `submissions/hw6/evidence/logs/audit.log` |
| Использование AI задокументировано | `docs/integrations/integration_documentation.md`, `docs/security/security_audit.md` | применение AI на этапах интеграций и аудита безопасности описано (раздел «Использование AI в аудите безопасности») | `submissions/hw6/README.md` |
| Monitoring + health check | `supabase/functions/health/`, `src/lib/analytics.ts` | `GET /functions/v1/health = 200`; Яндекс.Метрика инициализируется на фронтенде при заданном `VITE_YANDEX_METRIKA_ID` | `submissions/hw6/evidence/logs/supabase-smoke.log` |
| Работающее приложение по публичной ссылке | `https://focustrack-ai.vercel.app` | production smoke 200, Playwright screenshots/video с публичного URL | `submissions/hw6/evidence/media/vercel-production/` |

## Проектная работа

| Критерий | Артефакт | Проверка | Evidence |
| --- | --- | --- | --- |
| MVP работает | `src/`, `supabase/`, `vercel.json` | build, unit, e2e, live Supabase e2e, Supabase smoke pass; production frontend URL работает | `submissions/final-project/evidence/`, `submissions/final-project/evidence/media/vercel-production/` |
| Артефакты защиты | `README.md`, `docs/architecture/architecture.md`, `submissions/final-project/presentation.md` | документы существуют и связаны | `submissions/final-project/README.md` |
| AI применен | `supabase/functions/`, `src/lib/focustrack-api.ts`, `tests/e2e/focustrack.spec.ts`, `docs/prompts/` | OpenRouter model and secrets configured server-side; UI запускает AI-уточнение, AI-планирование и RAG-вопрос по личным заметкам пользователя | `submissions/final-project/evidence/logs/supabase-smoke.log`, `submissions/final-project/evidence/logs/e2e.log` |
| Презентация | `submissions/final-project/presentation.md` | 10-minute outline prepared | `submissions/final-project/README.md` |
