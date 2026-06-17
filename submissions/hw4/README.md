# ДЗ 4 — Frontend MVP

Ссылка Otus: https://otus.ru/learning/493766/#/homework-chat/47736/

## Что сдавать

| Требование          | Файл или команда                                           |
| ------------------- | ---------------------------------------------------------- |
| Репозиторий с кодом | корень репозитория                                         |
| README              | `README.md`                                                |
| package.json        | `package.json`                                             |
| Отчет о разработке  | `docs/frontend/development_report.md`                      |
| Тесты               | `src/lib/progress.test.ts`, `tests/e2e/focustrack.spec.ts` |
| Скриншоты/видео     | `output/playwright/` после запуска e2e                     |

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

- создание цели;
- список целей и деталей;
- отметка задач;
- прогресс и график;
- weekly AI review;
- responsive layout;
- Google OAuth entry point;
- analytics event helper.

## Текст для отправки

```text
Добрый день! Сдаю ДЗ 4 по FocusTrack AI.

Frontend реализован на React + TypeScript + Vite + shadcn/ui.
Основной отчет: docs/frontend/development_report.md.
Команды проверки: pnpm run lint, pnpm run typecheck, pnpm run test, pnpm run build, pnpm run test:e2e.
Playwright сохраняет скриншоты и видео в output/playwright/.
```
