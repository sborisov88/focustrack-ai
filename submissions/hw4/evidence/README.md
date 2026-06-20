# Evidence — ДЗ 4

## Проверенные критерии

Подтверждено сборкой и тестами 2026-06-19 (ветка `closure-docs-2026-06-19`): typecheck, lint, unit, build, e2e — все с EXIT 0.

- frontend-приложение запускается и собирается (build EXIT=0);
- реализованы минимум 3 функции из ТЗ: цели, задачи, прогресс, AI Review, RAG, responsive dashboard;
- правила проекта подключены для AI-агента в нативном формате Cursor: `.cursor/rules/focustrack.mdc` (`alwaysApply`, зеркало `AGENTS.md`);
- unit-тесты: 30 passed в 3 файлах (`progress.test.ts` + `focustrack-api.test.ts` + `auth.test.ts`), включая streak, обработку ошибок и edge-кейсы;
- Playwright e2e: 9 passed / 11 skipped (добавлен строгий 404-сценарий; skip — кросс-проектные дубли desktop/mobile и live-Supabase сценарий, требующий env `E2E_DEMO_EMAIL` / `E2E_DEMO_PASSWORD`);
- отчёт о разработке содержит примеры промптов и пример мультимодальной отладки (`docs/frontend/development_report.md`);
- контрольный multimodal debugging evidence по скриншотам desktop/mobile сохранен в `multimodal-debugging.md`;
- сохранены скриншоты и видео;
- Google OAuth: entry point реальный (`src/lib/auth.ts`), но автоматического e2e-доказательства входа через Google нет — провайдерский сценарий проверяется вручную.

## Проверенные файлы

- `src/features/dashboard/focustrack-dashboard.tsx`
- `src/lib/progress.ts`
- `src/lib/progress.test.ts`
- `src/lib/focustrack-api.ts`
- `src/lib/focustrack-api.test.ts` — unit-тесты обработки ошибок и edge-кейсов API-слоя
- `src/lib/analytics.ts` — `initAnalytics` / `trackEvent` (Яндекс.Метрика, активна при `VITE_YANDEX_METRIKA_ID`)
- `src/lib/auth.ts` — Google OAuth entry point через Supabase Auth
- `tests/e2e/focustrack.spec.ts`
- `.cursor/rules/focustrack.mdc` — правила проекта для AI в нативном формате Cursor
- `docs/frontend/development_report.md`
- `submissions/hw4/evidence/multimodal-debugging.md`

## AI-process evidence

- `multimodal-debugging.md` — контрольный прогон визуального ревью desktop/mobile скриншотов, список найденных рисков, статус исправлений и human review.

## Логи

- `logs/lint.log` (EXIT=0)
- `logs/typecheck.log` (EXIT=0)
- `logs/unit-test.log` — 30 passed в 3 файлах (EXIT=0)
- `logs/build.log` (EXIT=0)
- `logs/e2e.log` — 9 passed / 11 skipped (EXIT=0)

## Медиа

- `media/dashboard-desktop-initial.png` — личный планировщик с категориями целей и жизненными целями (полумарафон, IELTS, подушка безопасности, лендинг пет-проекта);
- `media/dashboard-desktop-after-flow.png` — дашборд после прохождения пользовательского сценария по целям и задачам;
- `media/dashboard-mobile.png` — адаптивный мобильный вид планировщика;
- `media/*.webm` — записи прохождения e2e-сценариев (desktop/mobile);
- `media/playwright-report.html` — HTML-отчёт Playwright.
