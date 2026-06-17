# Матрица приемки OTUS

Дата проверки: 17 июня 2026.

## Общий проверочный контур

| Проверка | Результат | Evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | pass | `output/verification/logs/pnpm-install.log` |
| `pnpm run lint` | pass | `output/verification/logs/lint.log` |
| `pnpm run typecheck` | pass | `output/verification/logs/typecheck.log` |
| `pnpm run test` | pass, 3 unit tests | `output/verification/logs/unit-test.log` |
| `pnpm run build` | pass | `output/verification/logs/build.log` |
| `pnpm audit --audit-level high` | pass, no known vulnerabilities | `output/verification/logs/audit.log` |
| `pnpm run test:e2e` | pass, 2 Playwright сценария | `output/verification/logs/e2e.log` |
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
| Инструмент установлен и проверен | `docs/research/001-ai-tooling/setup_guide.md`, `output/verification/logs/tooling.log` | версии Node, pnpm, npx, Supabase CLI сохранены | `submissions/hw1/evidence/logs/tooling.log` |

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
| Не менее 3 функций из ТЗ | `src/features/dashboard/focustrack-dashboard.tsx` | цель, задачи, прогресс, AI Review, категории целей, responsive UI на демо с жизненными целями | `submissions/hw4/evidence/media/` |
| Адаптивность | `tests/e2e/focustrack.spec.ts` | desktop и mobile сценарии Playwright | `submissions/hw4/evidence/logs/e2e.log` |
| Не менее 3 тестов | `src/lib/progress.test.ts`, `tests/e2e/focustrack.spec.ts` | 3 unit tests и 2 e2e сценария | `submissions/hw4/evidence/logs/unit-test.log` |

## ДЗ 5

| Критерий | Артефакт | Проверка | Evidence |
| --- | --- | --- | --- |
| Backend работает | `supabase/migrations/`, `supabase/functions/` | remote database up to date, health 200 | `submissions/hw5/evidence/logs/supabase-smoke.log` |
| Не менее 3 endpoints | `supabase/functions/` | ai-clarify, ai-plan, ai-weekly-review, rag-answer, health | `submissions/hw5/evidence/logs/supabase-smoke.log` |
| E2E интеграция | `src/lib/focustrack-api.ts`, `tests/e2e/focustrack.spec.ts` | Playwright прошел | `submissions/hw5/evidence/logs/e2e.log` |
| Auth + RLS/middleware | `supabase/migrations/`, `supabase/config.toml` | AI/RAG functions protected, no-JWT smoke 401 | `submissions/hw5/evidence/logs/supabase-smoke.log` |

## ДЗ 6

| Критерий | Артефакт | Проверка | Evidence |
| --- | --- | --- | --- |
| CI/CD работает | `.github/workflows/ci.yml`, `vercel.json` | quality gate и Vercel frontend deploy job успешно прошли после push в `main` | `submissions/hw6/evidence/logs/github-actions-final-run.json` |
| Не менее 2 интеграций | `docs/integrations/integration_documentation.md` | Google OAuth entry point, analytics helper, Supabase health, OpenRouter | `submissions/hw6/README.md` |
| Audit проведен | `docs/security/security_audit.md` | `pnpm audit --audit-level high` pass | `submissions/hw6/evidence/logs/audit.log` |
| Monitoring + health check | `supabase/functions/health/` | `GET /functions/v1/health = 200` | `submissions/hw6/evidence/logs/supabase-smoke.log` |
| Работающее приложение по публичной ссылке | `https://focustrack-ai.vercel.app` | production smoke 200, Playwright screenshots/video с публичного URL | `submissions/hw6/evidence/media/vercel-production/` |

## Проектная работа

| Критерий | Артефакт | Проверка | Evidence |
| --- | --- | --- | --- |
| MVP работает | `src/`, `supabase/`, `vercel.json` | build, e2e, Supabase smoke pass; production frontend URL работает | `submissions/final-project/evidence/`, `submissions/final-project/evidence/media/vercel-production/` |
| Артефакты защиты | `README.md`, `docs/architecture/architecture.md`, `presentation/README.md` | документы существуют и связаны | `submissions/final-project/README.md` |
| AI применен | `supabase/functions/`, `docs/prompts/` | OpenRouter model and secrets configured server-side; AI-планирование целей и RAG по личным заметкам пользователя | `submissions/final-project/evidence/logs/supabase-smoke.log` |
| Презентация | `presentation/README.md` | 10-minute outline prepared | `submissions/final-project/README.md` |
