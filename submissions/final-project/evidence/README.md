# Evidence — проектная работа

## Проверенные критерии

- MVP запускается, собирается и проходит happy path на жизненной цели (создание цели → AI-уточнение → AI-план → задачи и прогресс → weekly review → RAG-вопрос по личным заметкам);
- Supabase backend, RLS, Edge Functions и OpenRouter настроены;
- AI применяется в продукте через server-side Edge Functions;
- подготовлены README, архитектура, промпты, roadmap, презентационный план и evidence;
- Playwright записал скриншоты и видео нового UI.

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

## Логи

- `logs/pnpm-install.log`
- `logs/lint.log`
- `logs/typecheck.log`
- `logs/unit-test.log`
- `logs/build.log`
- `logs/audit.log`
- `logs/e2e.log`
- `logs/supabase-smoke.log`
- `logs/tooling.log`

## Медиа

- `media/dashboard-desktop-initial.png` — дашборд нового UI: «Категории целей» и «Личный планировщик» с жизненными целями (полумарафон, IELTS, подушка безопасности, лендинг пет-проекта);
- `media/dashboard-desktop-after-flow.png` — состояние после сценария: отмеченная задача и пересчитанный прогресс по цели;
- `media/dashboard-mobile.png` — мобильный вид планировщика личных и рабочих целей;
- `media/*.webm` — Playwright-записи сквозного сценария на жизненной цели;
- `media/html-report/index.html` — HTML-отчет Playwright;
- `media/vercel-production/` — скриншоты production-деплоя https://focustrack-ai.vercel.app.
