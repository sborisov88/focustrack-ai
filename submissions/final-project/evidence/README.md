# Evidence — проектная работа

## Проверенные критерии

- MVP запускается, собирается и проходит happy path на жизненной цели (создание цели -> AI-уточнение -> AI-план -> задачи и прогресс -> weekly review -> RAG-вопрос по личным заметкам);
- Supabase backend, RLS, Edge Functions и OpenRouter настроены;
- AI применяется в продукте через server-side Edge Functions, а UI вызывает `ai-clarify`, `ai-plan`, `ai-weekly-review` и `rag-answer`;
- подготовлены README, архитектура, промпты, roadmap, презентационный план и evidence;
- Playwright проверяет dashboard, AI-уточнение/AI-план, RAG-вопрос, навигацию, login dialog и mobile usability.
- Отдельный live Supabase e2e подтверждает persistence создания цели и статуса задачи после reload.

## Проверенные файлы

- `README.md`
- `ROADMAP.md`
- `docs/architecture/architecture.md`
- `docs/architecture/adr/001-tech-stack.md`
- `docs/product/`
- `docs/prompts/`
- `docs/backend/`
- `docs/security/security_audit.md`
- `presentation/README.md`
- `submissions/acceptance-matrix.md`

## Артефакты для преподавателя

- основной репозиторий: `https://github.com/sborisov88/focustrack-ai`;
- финальная проектная работа: `submissions/final-project/README.md`;
- матрица приемки: `submissions/acceptance-matrix.md`;
- production demo: `https://focustrack-ai.vercel.app`;
- опубликованный финальный checkpoint: `final-project-submitted`;
- опубликованные checkpoints по ДЗ: `hw1-submitted`, `hw2-submitted`, `hw3-submitted`, `hw4-submitted`, `hw5-submitted`, `hw6-submitted`.

## Логи

- `logs/pnpm-install.log`
- `logs/lint.log`
- `logs/typecheck.log`
- `logs/unit-test.log`
- `logs/build.log`
- `logs/audit.log`
- `logs/e2e.log` — 6 выполненных Playwright сценариев, включая AI-clarify/AI-plan и RAG.
- `logs/live-supabase-e2e.log` — live login, создание цели и task toggle через Supabase с проверкой после reload.
- `logs/supabase-smoke.log`
- `logs/tooling.log`

## Медиа

- `media/dashboard-desktop-initial.png` — дашборд нового UI: «Категории целей» и «Личный планировщик» с жизненными целями (полумарафон, IELTS, подушка безопасности, лендинг пет-проекта);
- `media/dashboard-desktop-after-flow.png` — состояние после сценария: отмеченная задача и пересчитанный прогресс по цели;
- `media/dashboard-mobile.png` — мобильный вид планировщика личных и рабочих целей;
- `media/*.webm` — Playwright-записи сквозных сценариев на жизненных целях;
- `media/html-report/index.html` — HTML-отчет Playwright;
- `media/vercel-production/` — скриншоты production-деплоя https://focustrack-ai.vercel.app.
