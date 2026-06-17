# ДЗ 4 — Frontend MVP

Ссылка Otus: https://otus.ru/learning/493766/#/homework-chat/47736/

## Что сдавать

| Требование              | Файл или команда                                                                  |
| ----------------------- | --------------------------------------------------------------------------------- |
| Репозиторий с кодом     | корень репозитория                                                                |
| README                  | `README.md`                                                                       |
| package.json            | `package.json`                                                                    |
| Отчет о разработке      | `docs/frontend/development_report.md`                                             |
| Правила проекта для AI  | `.cursor/rules/focustrack.mdc` (нативный формат Cursor, зеркало корневого `AGENTS.md`) |
| Unit-тесты              | `src/lib/progress.test.ts`, `src/lib/focustrack-api.test.ts`                      |
| E2E-тесты               | `tests/e2e/focustrack.spec.ts`                                                    |
| Скриншоты/видео         | `output/playwright/` после запуска e2e                                            |

## Локальный запуск

```bash
pnpm install
pnpm dev
```

## Проверка

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:e2e
```

## Реализованные функции

Демонстрационный workspace показывает жизненные цели пользователя: «Пробежать первый полумарафон», «Сдать IELTS на 7.0», «Сформировать подушку безопасности на 6 месяцев», «Запустить лендинг пет-проекта».

- создание цели;
- список целей и деталей с категориями целей;
- отметка задач;
- прогресс и график;
- weekly AI review;
- RAG-ответ по заметкам пользователя;
- responsive layout;
- Google OAuth entry point через Supabase Auth (`src/lib/auth.ts`); вход через Google проверяется вручную, автоматического e2e-доказательства входа нет;
- Яндекс.Метрика: `src/lib/analytics.ts` (`initAnalytics`/`trackEvent`); подключается из `src/main.tsx` и активна только при заданном `VITE_YANDEX_METRIKA_ID`, иначе безопасный no-op.

## Самопроверка ДЗ 4

| Требование занятия                          | Статус | Где смотреть                                                                                  |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Frontend запускается и собирается           | done   | `pnpm dev`, `pnpm run build` (build EXIT=0)                                                    |
| Реализованы минимум 3 функции из ТЗ         | done   | цели, задачи, прогресс, Weekly AI Review, RAG (`src/features/dashboard/focustrack-dashboard.tsx`) |
| Правила проекта подключены для AI-агента    | done   | `.cursor/rules/focustrack.mdc` (`alwaysApply`, зеркало `AGENTS.md`)                            |
| Unit-тесты, включая обработку ошибок        | done   | 12 unit-тестов в 2 файлах: `src/lib/progress.test.ts`, `src/lib/focustrack-api.test.ts`        |
| E2E-тесты (Playwright)                       | done   | `tests/e2e/focustrack.spec.ts` — 6 passed / 8 skipped                                          |
| Отчет о разработке с примерами промптов     | done   | `docs/frontend/development_report.md` (примеры промптов + пример мультимодальной отладки)      |
| Скриншоты/видео                              | done   | `submissions/hw4/evidence/media/` (после запуска e2e — `output/playwright/`)                   |
| Google OAuth e2e автоматизирован            | нет    | entry point реальный, вход через Google проверяется вручную                                    |

Подтверждено сборкой и тестами 2026-06-17 (ветка `audit-remediation-2026-06-17`): typecheck, lint, unit (12 passed), build, e2e (6 passed / 8 skipped) — все с EXIT 0.

## Текст для отправки

```text
Добрый день! Сдаю ДЗ 4 по FocusTrack AI.

Frontend реализован на React + TypeScript + Vite + shadcn/ui.
Правила проекта для AI-агента подключены в нативном формате Cursor: .cursor/rules/focustrack.mdc (зеркало AGENTS.md).
Unit-тесты: 12 passed в 2 файлах (src/lib/progress.test.ts и src/lib/focustrack-api.test.ts, включая обработку ошибок RAG-вопроса, пустых документов, демо-фоллбэки и toggleTask).
E2E (Playwright): 6 passed / 8 skipped (skip — кросс-проектные дубли desktop/mobile и live-Supabase сценарий, требующий env E2E_DEMO_EMAIL/E2E_DEMO_PASSWORD).
Основной отчет с примерами промптов и примером мультимодальной отладки: docs/frontend/development_report.md.
Команды проверки: pnpm run lint, pnpm run typecheck, pnpm run test, pnpm run build, pnpm run test:e2e.
Playwright сохраняет скриншоты и видео в output/playwright/.
```
